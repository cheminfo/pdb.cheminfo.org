import type { EchoEntry } from './EchoOverlay.tsx';
import {
  applyTrackball,
  axisVector,
  buildResetSnapshotFn,
} from './cameraControl.ts';
import type {
  AtomsPatch,
  BondsPatch,
  ChannelKey,
  RibbonPatch,
  SurfacePatch,
} from './channels.ts';
import { createChannels } from './channels.ts';
import type {
  ContactsOptions,
  DistanceToOptions,
  DistancesPatch,
  HbondsPatch,
} from './measurements.ts';
import { createMeasurements } from './measurements.ts';
import type { CreateModelOptions } from './models.ts';
import { createModelRegistry } from './models.ts';
import type {
  InteractionsApi,
  LociHelpers,
  MolScriptApi,
  PluginContext,
  ShapesApi,
  StructureElementApi,
} from './molstarTypes.ts';
import { compileSelection } from './selectionCompiler.ts';
import type { Selection as SelectionAst } from './selectionParser.ts';
import { parseSelection } from './selectionParser.ts';
import { resolveShapePrimitive } from './shapeResolve.ts';

/**
 * Wraps a parsed selection AST in an opaque token. The internal renderer
 * uses these directly; scripts see a richer `Selection` object (defined in
 * `MolStar.ts`) that extends this with rendering channels and methods.
 */
export interface SelectionToken {
  readonly __ast: SelectionAst;
  readonly source: string;
}

/** Position + font options for the on-canvas echo (HTML overlay). */
export interface EchoOptions {
  position?: 'top' | 'middle' | 'bottom';
  size?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

/**
 * Font options for `selection.label(...)`. Mirrors {@link EchoOptions} minus
 * `position` — 3D labels are anchored to atoms, not screen edges. `size` is
 * a Mol* size-factor multiplier on the default text size (`1` = default).
 */
export interface LabelOptions {
  /** Size factor (multiplier on the default 3D text size). */
  size?: number;
  /** Render text in bold. */
  bold?: boolean;
  /** Render text in italic. */
  italic?: boolean;
  /** Uniform CSS color for the text (name or `#rrggbb` / `#rgb`). */
  color?: string;
}

/**
 * Animation options shared by `selection.focus(...)` and `selection.zoom(...)`.
 * `seconds` is the duration of the camera tween; omit (or pass `0`) for an
 * instant snap.
 */
export interface CameraTransitionOptions {
  /** Tween duration in seconds. Omit or `0` for an instant snap. */
  seconds?: number;
}

/** Options accepted by `ms.rotate(...)`. */
export interface RotateOptions {
  /**
   * Rotation axis.
   * @default 'y'
   */
  axis?: 'x' | 'y' | 'z';
  /**
   * Total rotation, in degrees.
   * @default 360
   */
  degrees?: number;
  /**
   * Rotation speed, in degrees per second.
   * @default 60
   */
  speed?: number;
}

/**
 * Script-facing helper API. Each method maps to a channel verb (`setAtoms`,
 * `setBonds`, …) or a viewer/camera op, and translates the call to Mol* API
 * sequences.
 */
export interface ScriptApi {
  /** Parse a selection expression into a `Selection` token. */
  select: (expression: string) => SelectionToken;
  /** Intersect two selections (used by `selection.select(sub)`). */
  intersect: (a: SelectionToken, b: SelectionToken) => SelectionToken;
  readonly all: SelectionToken;
  readonly none: SelectionToken;

  /** Wipe every representation added by previous helper calls. */
  clear: () => Promise<void>;
  /**
   * Restore the freshly-loaded view: clear every script-added representation
   * and measurement, drop the persistent selection, and reset the camera to
   * Mol*'s auto-frame (initial center, zoom, and orientation). Equivalent
   * to clicking the page's Reset button from inside a script.
   */
  reset: () => Promise<void>;

  setAtoms: (selection: SelectionToken, patch: AtomsPatch) => Promise<void>;
  setBonds: (selection: SelectionToken, patch: BondsPatch) => Promise<void>;
  setRibbon: (selection: SelectionToken, patch: RibbonPatch) => Promise<void>;
  setSurface: (selection: SelectionToken, patch: SurfacePatch) => Promise<void>;
  setHbonds: (selection: SelectionToken, patch: HbondsPatch) => Promise<void>;
  setDistances: (
    selection: SelectionToken,
    patch: DistancesPatch,
  ) => Promise<void>;
  /** Add one distance line from `selection` to `other`. */
  addDistanceTo: (
    selection: SelectionToken,
    other: SelectionToken,
    options?: DistanceToOptions,
  ) => Promise<void>;
  /**
   * Compute and render contacts between two selections via Mol*'s
   * chemistry-aware `extensions/interactions` pipeline. Implementation
   * behind `selection.contactsWith(other, options?)`.
   */
  addContacts: (
    selection: SelectionToken,
    other: SelectionToken,
    options?: ContactsOptions,
  ) => Promise<void>;
  /** Toggle visibility of a measurement-style channel for `selection`. */
  setMeasurementVisibility: (
    selection: SelectionToken,
    channel: 'distances' | 'hbonds' | 'contacts',
    visible: boolean,
  ) => void;
  label: (
    selection: SelectionToken,
    template: string,
    options?: LabelOptions,
  ) => Promise<void>;

  /** Toggle visibility of a single channel of `selection`. */
  setChannelVisibility: (
    selection: SelectionToken,
    channel: ChannelKey,
    visible: boolean,
  ) => void;
  /** Toggle visibility of every channel of `selection`. */
  setSelectionVisibility: (selection: SelectionToken, visible: boolean) => void;

  /**
   * Toggle visibility of every cell of the given kind across every
   * selection — the implementation behind `ms.<kind>.show()/hide()`.
   * Hierarchical state (color, sizeFactor, …) is preserved; only
   * `isHidden` flips, so a later `show()` restores the prior visual.
   */
  setKindVisibility: (
    kind:
      | 'atoms'
      | 'bonds'
      | 'ribbon'
      | 'surface'
      | 'label'
      | 'distances'
      | 'hbonds'
      | 'contacts',
    visible: boolean,
  ) => void;

  /**
   * Show / hide every component Mol* added through its default preset
   * (polymer cartoon, ligand ball-and-stick, water spheres). Components
   * tagged `'scripting'` (created by the channel system) are untouched.
   */
  setDefaultsVisibility: (visible: boolean) => Promise<void>;

  selectionHalos: (on: boolean) => Promise<void>;

  focus: (
    selection: SelectionToken,
    options?: CameraTransitionOptions,
  ) => Promise<void>;
  /**
   * Center + frame the camera on `selection`'s bounding sphere such that the
   * sphere fills `factor` of the viewport. `factor = 1` matches `focus()`;
   * smaller values leave more margin around the selection. Pass
   * `{ seconds }` to animate the move — Mol* tweens the camera over the
   * given duration instead of snapping.
   */
  zoom: (
    selection: SelectionToken,
    factor?: number,
    options?: CameraTransitionOptions,
  ) => Promise<void>;
  resetCamera: () => Promise<void>;
  /**
   * Frame the entire loaded structure with a comfortable margin.
   * Pins the camera (sets `manualReset: true`) so subsequent rep changes
   * don't undo the framing. Use after `switchModel(...)` to centre on the
   * structure once a synthetic model has gone away.
   */
  fit: (factor?: number, options?: CameraTransitionOptions) => Promise<void>;
  /**
   * Spin the camera around the given axis. Pass `'off'` to stop.
   * @param axis - Rotation axis, or `'off'` to stop spinning.
   * @param speedDegreesPerSecond - Rotation speed in degrees per second.
   *   Defaults to `30`.
   */
  spin: (
    axis: 'x' | 'y' | 'z' | 'off',
    speedDegreesPerSecond?: number,
  ) => Promise<void>;
  /**
   * Rotate the camera by a finite number of degrees and resolve when the
   * rotation is finished. The trackball is left stopped on completion.
   */
  rotate: (options?: RotateOptions) => Promise<void>;

  echo: (text: string, options?: EchoOptions) => void;
  clearEcho: () => void;

  /**
   * Toggle the viewer pane's full-screen mode. `true` enters, `false` exits;
   * omit (or pass `undefined`) to flip the current state. Implementation
   * behind `ms.fullscreen(...)`.
   */
  setFullscreen: (on?: boolean) => void;

  delay: (seconds: number) => Promise<void>;

  /**
   * Draw a labeled distance line between the centroids of two selections.
   * Kept for backward compatibility — the canonical surface is now
   * `selection.distances.to(other, options?)`.
   */
  distance: (
    selection1: SelectionToken,
    selection2: SelectionToken,
  ) => Promise<void>;

  /**
   * Register the implicit `'initial'` model on first `ms.loadPDB(text)`.
   * Subsequent calls with the same text are a no-op; calls with different
   * text are silently ignored (use `createModel` to add another model).
   */
  ensureInitialModel: (text: string) => void;
  /**
   * Create a named model. The active model's PDB is inherited unless
   * `options.pdb` is provided; the op log always starts empty (each model
   * is its own visual scene).
   */
  createModel: (name: string, options?: CreateModelOptions) => Promise<void>;
  /** Make a previously-created model active (re-runs its op log). */
  switchModel: (name: string) => Promise<void>;
  currentModel: () => string;
  deleteModel: (name: string) => void;
  listModels: () => string[];

  /**
   * Add an arbitrary shape primitive to the active model. Implementation
   * behind `ms.arrow(...)`, `ms.cylinder(...)`, `ms.sphere(...)`. The
   * primitive is recorded into the active model's op log so it replays on
   * `switchModel`.
   */
  addShape: (primitive: ShapePrimitiveSpec) => Promise<void>;
}

/** Tuple form of a 3D point passed to shape methods. */
export type Vec3Spec = readonly [number, number, number];

/** Script-friendly shape spec — a thin wrapper over `ShapePrimitive`. */
export type ShapePrimitiveSpec =
  | {
      kind: 'cylinder';
      from: Vec3Spec;
      to: Vec3Spec;
      radius?: number;
      color?: string;
      label?: string;
    }
  | {
      kind: 'arrow';
      from: Vec3Spec;
      to: Vec3Spec;
      radius?: number;
      color?: string;
      label?: string;
      headLength?: number;
      headRadius?: number;
    }
  | {
      kind: 'sphere';
      center: Vec3Spec;
      radius?: number;
      color?: string;
      label?: string;
    }
  | {
      kind: 'text';
      position: Vec3Spec;
      text: string;
      color?: string;
      /** Size factor (multiplier on the default 3D text size). Defaults to `1`. */
      size?: number;
      /** Render glyphs in bold. Defaults to `false`. */
      bold?: boolean;
      /** Render glyphs in italic. Defaults to `false`. */
      italic?: boolean;
      /** Tooltip; falls back to the rendered text. */
      label?: string;
    };

/** Resources passed to `createScriptApi` from the page-level wiring. */
export interface ScriptApiContext {
  plugin: unknown;
  molScript: unknown;
  setEchoEntry: (entry: EchoEntry | null) => void;
  /** Raw PDB text of the loaded structure (the implicit `'initial'` model). */
  pdbText: string;
  /** Lazily-imported Mol* color module for hex → Color conversion. */
  colorModule: { Color: (hex: number) => unknown };
  /** Lazily-imported Mol* `Loci` helpers, used by `selection.zoom(...)`. */
  lociHelpers: LociHelpers;
  /**
   * Lazily-imported Mol* `StructureElement` helpers used by the measurements
   * module to validate atom-loci and to build `Bundle` objects for the
   * interactions extension.
   */
  structureElement: StructureElementApi;
  /**
   * Lazily-imported transformers from `mol-plugin-state` and the
   * `extensions/interactions` extension. Drives the Mol*-styled cylinder
   * rendering for `selection.hbonds` (via `CustomInteractions`) and the
   * chemistry-aware contact detection for `selection.contactsWith(other)`
   * (via `ComputeContacts`).
   */
  interactions: InteractionsApi;
  /**
   * Lazily-imported `addShape` helper from `./shapes.ts` plus its
   * dependencies. Implements `ms.arrow(...)`, `ms.cylinder(...)`,
   * `ms.sphere(...)`.
   */
  shapes: ShapesApi;
  /**
   * Mutable handle to the PDB text currently loaded inside Mol*. Persists
   * across script Runs (held by the page) so `clearAll` can detect when a
   * previous run left a swapped structure and restore the original.
   */
  loadedPdbRef: { current: string };
  /**
   * Toggle a CSS class on the viewer container so the Mol* canvas briefly
   * dims while a model swap is in flight. Lets the user see the transition
   * even when the swap completes in milliseconds.
   */
  setSwapping: (swapping: boolean) => void;
  /**
   * Drive the viewer-pane full-screen toggle from a script. Calling with
   * `true` enters fullscreen, `false` exits, `undefined` flips the current
   * state. Wired by the page to a ref populated inside the
   * `react-science` `FullScreenProvider` (so the actual `useFullscreen`
   * context is bridged out to the script API).
   */
  setFullscreen: (on?: boolean) => void;
}

/**
 * Factory: build a `ScriptApi` bound to the given Mol* plugin and overlay
 * setters. The returned object is what student scripts execute against.
 * @param context - Plugin + Mol* modules + overlay setters.
 * @returns A ready-to-call `ScriptApi`.
 */
export function createScriptApi(context: ScriptApiContext): ScriptApi {
  const plugin = context.plugin as PluginContext;
  const molScript = context.molScript as MolScriptApi;
  const channels = createChannels({
    plugin,
    molScript,
    colorModule: context.colorModule,
  });
  const measurements = createMeasurements({
    plugin,
    molScript,
    colorModule: context.colorModule,
    structureElement: context.structureElement,
    interactions: context.interactions,
  });

  async function selectionToLoci(selection: SelectionToken): Promise<unknown> {
    const structure =
      plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
    if (!structure) return null;
    const queryResult = molScript.Script.getStructureSelection(
      (builder) => compileSelection(selection.__ast, builder),
      structure,
    );
    return molScript.StructureSelection.toLociWithSourceUnits(queryResult);
  }

  async function rawDistance(
    selection1: SelectionToken,
    selection2: SelectionToken,
  ): Promise<void> {
    const loci1 = await selectionToLoci(selection1);
    const loci2 = await selectionToLoci(selection2);
    if (!loci1 || !loci2) return;
    await plugin.managers.structure.measurement.addDistance(loci1, loci2);
  }

  async function rawAddShape(primitive: unknown): Promise<void> {
    // The primitive arriving here has already been resolved (radius, hex
    // color etc.) — see `addShape` further down. Mesh primitives go to
    // the `Mesh`-based transformer, text primitives to the `Text`-based
    // one (different geometry pipelines, separate Mol* transformers).
    // Both are tagged `'scripting'` so the model-swap teardown removes them
    // cleanly.
    const kind = (primitive as { kind?: string }).kind;
    if (kind === 'text') {
      await context.shapes.addTextShape(
        plugin,
        [primitive],
        context.interactions.ShapeRepresentation3D,
        { tags: ['scripting'], label: 'Scripting Text' },
      );
      return;
    }
    await context.shapes.addShape(
      plugin,
      [primitive],
      context.interactions.ShapeRepresentation3D,
      { tags: ['scripting'], label: 'Scripting Shape' },
    );
  }

  async function resetTransients(): Promise<void> {
    await plugin.managers.structure.measurement.clear?.();
    plugin.managers.structure.selection.clear();
    plugin.canvas3d?.setProps({
      renderer: { selectStrength: 0 },
      // Stop any spin/rotate the previous script left running, so Run starts
      // from the same stationary trackball as the initial page mount.
      trackball: { animate: { name: 'off', params: {} } },
    });
    context.setEchoEntry(null);
  }

  const models = createModelRegistry({
    plugin,
    channels,
    loadedPdbRef: context.loadedPdbRef,
    setSwapping: context.setSwapping,
    resetTransients,
    rawDistance,
    rawAddShape,
  });

  async function clearAll(): Promise<void> {
    // Restore the original structure if a previous Run swapped it out, then
    // strip every `scripting`-tagged representation and reset transient state.
    await models.resetToOriginal(context.pdbText);
    await models.clearActive();
    await measurements.clearAll();
    await resetTransients();
    // Re-enable Mol*'s auto-fit. `zoom()` / `focus()` flip `manualReset`
    // on so subsequent rep changes don't undo the requested framing, but
    // that flag persists on the plugin — without this reset, running the
    // SAME script twice in a row, or switching to a different scene that
    // expects a fresh auto-fit, would still see the pin from the previous
    // run and skip the load-time framing the next script depends on.
    plugin.canvas3d?.setProps({ camera: { manualReset: false } });
    // Re-show every default component the script may have hidden via
    // setDefaultsVisibility(false) or setSelectionVisibility(..., false).
    // Without this, camera.reset() frames only the still-visible subset
    // and the user sees a zoomed-in view instead of the full protein.
    const structureRef =
      plugin.managers.structure.hierarchy.current.structures[0];
    if (structureRef) {
      const defaults = structureRef.components.filter(
        (component) => !component.cell.transform.tags?.includes('scripting'),
      );
      if (defaults.length > 0) {
        plugin.managers.structure.hierarchy.toggleVisibility(defaults, 'show');
      }
    }
  }

  return {
    select: selectFromString,
    intersect: (a, b) => ({
      __ast: { kind: 'and', left: a.__ast, right: b.__ast },
      source: `(${a.source}) and (${b.source})`,
    }),
    all: { __ast: { kind: 'group', name: 'all' }, source: 'all' },
    none: { __ast: { kind: 'group', name: 'none' }, source: 'none' },

    clear: clearAll,
    reset: async () => {
      await clearAll();
      // Force the camera back to the canonical frame (looking toward -Z,
      // +Y up). `plugin.managers.camera.reset()` alone preserves the
      // current direction and up vector — `getFocus(target, radius)` is
      // called with no `up`/`dir` overrides, so any rotation accumulated
      // by spin/rotate/drag persists across reset. Passing a snapshot
      // function lets us call `getInvariantFocus`, which copies up and
      // dir directly instead of merely matching the current orientation.
      // `durationMs: 0` keeps it an instant snap with no transition.
      plugin.managers.camera.reset(buildResetSnapshotFn, 0);
    },

    setAtoms: (selection, patch) => {
      models.recordOp({ kind: 'setAtoms', selection, patch });
      return channels.setAtoms(selection, patch);
    },
    setBonds: (selection, patch) => {
      models.recordOp({ kind: 'setBonds', selection, patch });
      return channels.setBonds(selection, patch);
    },
    setRibbon: (selection, patch) => {
      models.recordOp({ kind: 'setRibbon', selection, patch });
      return channels.setRibbon(selection, patch);
    },
    setSurface: (selection, patch) => {
      models.recordOp({ kind: 'setSurface', selection, patch });
      return channels.setSurface(selection, patch);
    },
    // Measurement-style channels (hbonds, distances) are not yet recorded
    // into the model op log — switching models drops their state. Acceptable
    // for now: the only consumers are scenes that don't use createModel.
    setHbonds: (selection, patch) => measurements.setHbonds(selection, patch),
    setDistances: (selection, patch) =>
      measurements.setDistances(selection, patch),
    addDistanceTo: (selection, other, options) =>
      measurements.addDistanceTo(selection, other, options),
    addContacts: (selection, other, options) =>
      measurements.addContacts(selection, other, options),
    setMeasurementVisibility: (selection, channel, visible) => {
      measurements.setVisibility(selection, channel, visible);
    },
    label: (selection, template) => {
      models.recordOp({ kind: 'label', selection, template });
      return channels.label(selection, template);
    },
    setChannelVisibility: (selection, channel, visible) => {
      models.recordOp({
        kind: 'channelVisibility',
        selection,
        channel,
        visible,
      });
      channels.setChannelVisibility(selection, channel, visible);
    },
    setSelectionVisibility: (selection, visible) => {
      models.recordOp({ kind: 'selectionVisibility', selection, visible });
      channels.setSelectionVisibility(selection, visible);
    },

    setKindVisibility: (kind, visible) => {
      if (isMeasurementKind(kind)) {
        measurements.setKindVisibility(kind, visible);
      } else {
        channels.setKindVisibility(kind, visible);
      }
    },

    setDefaultsVisibility: async (visible) => {
      const structureRef =
        plugin.managers.structure.hierarchy.current.structures[0];
      if (!structureRef) return;
      const defaults = structureRef.components.filter(
        (component) => !component.cell.transform.tags?.includes('scripting'),
      );
      if (defaults.length === 0) return;
      plugin.managers.structure.hierarchy.toggleVisibility(
        defaults,
        visible ? 'show' : 'hide',
      );
    },

    selectionHalos: async (on) => {
      plugin.canvas3d?.setProps({ renderer: { selectStrength: on ? 0.3 : 0 } });
    },

    focus: async (selection, options) => {
      const loci = await selectionToLoci(selection);
      if (!loci) return;
      plugin.managers.structure.selection.fromLoci('set', loci);
      const durationMs = secondsToDurationMs(options?.seconds);
      plugin.managers.camera.focusLoci(loci, { durationMs });
      await waitForCameraAnimation(options?.seconds);
      // See zoom() — pin the camera so subsequent rep changes don't
      // re-fit the view and undo the explicit focus.
      plugin.canvas3d?.setProps({ camera: { manualReset: true } });
    },
    zoom: async (selection, factor, options) => {
      const loci = await selectionToLoci(selection);
      if (!loci) return;
      const resolvedFactor = factor ?? 0.75;
      const safeFactor = Math.max(0.05, Math.min(1, resolvedFactor));
      const sphere = context.lociHelpers.getBoundingSphere(loci);
      const extraRadius = sphere
        ? (sphere.radius * (1 - safeFactor)) / safeFactor
        : 0;
      const durationMs = secondsToDurationMs(options?.seconds);
      plugin.managers.camera.focusLoci(loci, { extraRadius, durationMs });
      await waitForCameraAnimation(options?.seconds);
      // Mol*'s canvas3d auto-resets the camera every time a renderable's
      // bounding sphere moves outside the current camera sphere — which
      // means any rep we add AFTER zoom() (a new ribbon, a fattened tube,
      // a hidden bonds rep) can silently retarget the camera to fit the
      // scene tightly, undoing the margin the script asked for. Flip
      // `camera.manualReset` so the script's framing sticks until the
      // user (or another zoom/focus call) explicitly changes it.
      plugin.canvas3d?.setProps({ camera: { manualReset: true } });
    },
    resetCamera: async () => {
      plugin.managers.structure.selection.clear();
      // Re-enable auto-fit before resetting so the scene boundary drives
      // the new framing.
      plugin.canvas3d?.setProps({ camera: { manualReset: false } });
      plugin.managers.camera.reset();
    },
    fit: async (factor, options) => {
      // Frame every atom of the loaded structure. Same math as \`zoom\`,
      // just bound to the \`all\` selection so callers don't have to spell
      // it out after a \`switchModel\` (when the in-flight \`pdb\` handle
      // may point at the previous model).
      const loci = await selectionToLoci({
        __ast: { kind: 'group', name: 'all' },
        source: 'all',
      });
      if (!loci) return;
      const resolvedFactor = factor ?? 0.85;
      const safeFactor = Math.max(0.05, Math.min(1, resolvedFactor));
      const sphere = context.lociHelpers.getBoundingSphere(loci);
      const extraRadius = sphere
        ? (sphere.radius * (1 - safeFactor)) / safeFactor
        : 0;
      const durationMs = secondsToDurationMs(options?.seconds);
      plugin.managers.camera.focusLoci(loci, { extraRadius, durationMs });
      await waitForCameraAnimation(options?.seconds);
      plugin.canvas3d?.setProps({ camera: { manualReset: true } });
    },
    spin: async (axis, speedDegreesPerSecond = 30) => {
      applyTrackball(plugin, axis, speedDegreesPerSecond);
    },
    rotate: async (options) => {
      const axis = options?.axis ?? 'y';
      const degrees = options?.degrees ?? 360;
      const speed = options?.speed ?? 60;
      if (degrees === 0 || speed <= 0) {
        applyTrackball(plugin, 'off', 0);
        return;
      }
      // Negative degrees → spin in the opposite direction by negating the
      // axis vector. Mol*'s spin animation always uses |speed|, so the
      // direction has to come from the axis itself.
      const sign = degrees < 0 ? -1 : 1;
      const absDegrees = Math.abs(degrees);
      const baseAxis = axisVector(axis);
      const signedAxis: [number, number, number] = [
        baseAxis[0] * sign,
        baseAxis[1] * sign,
        baseAxis[2] * sign,
      ];
      plugin.canvas3d?.setProps({
        trackball: {
          animate: {
            name: 'spin',
            params: { speed: speed / 360, axis: signedAxis },
          },
        },
      });
      await new Promise<void>((resolve) => {
        setTimeout(resolve, (absDegrees / speed) * 1000);
      });
      applyTrackball(plugin, 'off', 0);
    },

    setFullscreen: (on) => context.setFullscreen(on),

    echo: (text, options) => {
      context.setEchoEntry({
        text,
        position: options?.position ?? 'top',
        size: options?.size ?? 24,
        bold: options?.bold ?? true,
        italic: options?.italic ?? false,
        color: options?.color ?? 'black',
      });
    },
    clearEcho: () => context.setEchoEntry(null),

    delay: (seconds) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, Math.max(0, seconds) * 1000);
      }),

    distance: async (selection1, selection2) => {
      models.recordOp({ kind: 'distance', selection1, selection2 });
      await rawDistance(selection1, selection2);
    },

    ensureInitialModel: (text) => models.ensureInitial(text),
    createModel: (name, options) => models.createModel(name, options),
    switchModel: (name) => models.switchModel(name),
    currentModel: () => models.currentModel(),
    deleteModel: (name) => models.deleteModel(name),
    listModels: () => models.listModels(),

    addShape: async (spec) => {
      // Resolve script-friendly defaults (CSS color → hex, default radii)
      // into the verbatim primitive the lazy-loaded shape module expects,
      // then record + dispatch through the model registry so it replays
      // on switchModel.
      const resolved = resolveShapePrimitive(spec, context.colorModule);
      models.recordOp({ kind: 'shape', primitive: resolved });
      await rawAddShape(resolved);
    },
  };
}

function selectFromString(expression: string): SelectionToken {
  return { __ast: parseSelection(expression), source: expression };
}

/**
 * Convert a script-facing `seconds` value to the `durationMs` Mol* expects.
 * Undefined / non-positive values map to `0` so the camera snaps instantly.
 * @param seconds - Tween duration from the script API, or `undefined`.
 * @returns Mol* `durationMs` (rounded to integer milliseconds).
 */
function secondsToDurationMs(seconds: number | undefined): number {
  if (!seconds || seconds <= 0) return 0;
  return Math.round(seconds * 1000);
}

/**
 * `focusLoci` schedules a tween on Mol*'s animation loop but returns
 * synchronously. Without a wait, the next script statement runs before the
 * camera finishes moving — defeating the point of `selection.zoom(...,
 * { seconds })`. We mirror the same delay so the await drains in step with
 * the camera. Small overshoot (50 ms) covers Mol*'s easing settle frame.
 * @param seconds - Tween duration; `undefined` / `0` resolves immediately.
 * @returns A promise that resolves once the camera tween has finished.
 */
function waitForCameraAnimation(seconds: number | undefined): Promise<void> {
  if (!seconds || seconds <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000 + 50);
  });
}

const MEASUREMENT_KINDS = ['distances', 'hbonds', 'contacts'] as const;

/**
 * Narrow an overlay kind to the subset owned by the measurements manager;
 * every other kind is a Mol* representation channel.
 * @param kind - Overlay kind coming from the script API.
 * @returns `true` when the kind is a measurement overlay.
 */
function isMeasurementKind(
  kind: string,
): kind is (typeof MEASUREMENT_KINDS)[number] {
  return (MEASUREMENT_KINDS as readonly string[]).includes(kind);
}
