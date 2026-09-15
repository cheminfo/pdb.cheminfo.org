import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  Divider,
  FormGroup,
  InputGroup,
  Intent,
  Menu,
  MenuItem,
  Popover,
  Tooltip,
} from '@blueprintjs/core';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { FullScreenProvider, useFullscreen } from 'react-science/ui';

import FloatingWindow from '../../shared/FloatingWindow.tsx';
import type { PdbViewerHandle } from '../../shared/PdbViewer.tsx';
import PdbViewer from '../../shared/PdbViewer.tsx';
import Splitter from '../../shared/Splitter.tsx';
import { fetchPdbText } from '../../shared/api/client.ts';
import { useAsync } from '../../shared/useAsync.ts';

import type { EchoEntry } from './EchoOverlay.tsx';
import EchoOverlay from './EchoOverlay.tsx';
import Editor from './Editor.tsx';
import type { Delay } from './MolStar.ts';
import { createMolStarClass } from './MolStar.ts';
import ProteinMenu from './ProteinMenu.tsx';
import { applyScriptingLoadDefaults } from './applyLoadDefaults.ts';
import ScriptingHelp from './help/ScriptingHelp.tsx';
import type { ScriptApi } from './helpers.ts';
import { createScriptApi } from './helpers.ts';
import type {
  InteractionsApi,
  LociHelpers,
  PluginContext,
  ShapesApi,
  StructureElementApi,
} from './molstarTypes.ts';
import { runScript } from './runScript.ts';
import {
  DEFAULT_PDB_ID,
  defaultSceneCode,
  scenesForProtein,
} from './scenes.ts';
import { useCanvasRecording } from './useCanvasRecording.ts';
import { useScriptingStorage } from './useScriptingStorage.ts';

interface ColorModule {
  Color: (hex: number) => unknown;
}

/**
 * Page mounted at `/scripting` and `/scripting/:pdbId`. Lets students write a small JS script using
 * a curated helper API (`api.cpk`, `api.cartoon`, `api.echo`, …) that
 * drives the Mol* viewer.
 *
 * URL params:
 *   `?scene=<id>`   – load a specific built-in scene on arrival (for sharing)
 *   `?autorun=1`    – execute the script automatically after the protein loads
 * @returns The Scripting page React element.
 */
export default function ScriptingPage() {
  const { pdbId: routePdbId } = useParams<{ pdbId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sceneParam = searchParams.get('scene');
  const autorunParam = searchParams.get('autorun') === '1';

  const urlPdbId = (routePdbId?.trim() || DEFAULT_PDB_ID).toUpperCase();
  const [trackedUrlPdbId, setTrackedUrlPdbId] = useState(urlPdbId);
  const [pdbId, setPdbId] = useState(urlPdbId);
  const [loadedId, setLoadedId] = useState(urlPdbId);
  if (trackedUrlPdbId !== urlPdbId) {
    setTrackedUrlPdbId(urlPdbId);
    setPdbId(urlPdbId);
    setLoadedId(urlPdbId);
  }

  // Pair the editor code with the protein ID it was loaded for so the autorun
  // check can confirm code is ready before firing.
  const [codeState, setCodeState] = useState({
    forId: urlPdbId,
    value: defaultSceneCode(urlPdbId),
  });
  const code = codeState.value;
  const setCode = (value: string) =>
    setCodeState((prev) => ({ ...prev, value }));
  const [echoEntry, setEchoEntry] = useState<EchoEntry | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [colorModule, setColorModule] = useState<ColorModule | null>(null);
  const [lociHelpers, setLociHelpers] = useState<LociHelpers | null>(null);
  const [structureElement, setStructureElement] =
    useState<StructureElementApi | null>(null);
  const [interactions, setInteractions] = useState<InteractionsApi | null>(
    null,
  );
  const [shapes, setShapes] = useState<ShapesApi | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const recording = useCanvasRecording();

  // ── Scene management UI state ─────────────────────────────────────────────
  const [deleteSceneId, setDeleteSceneId] = useState<string | null>(null);
  const [addingScene, setAddingScene] = useState(false);
  const [newSceneLabel, setNewSceneLabel] = useState('');

  // ── Protein menu UI state ─────────────────────────────────────────────────
  const [deleteProteinId, setDeleteProteinId] = useState<string | null>(null);

  // ── Revision UI state ─────────────────────────────────────────────────────
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisionLabel, setRevisionLabel] = useState('');

  // ── Backup / restore ──────────────────────────────────────────────────────
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const viewerHandleRef = useRef<PdbViewerHandle | null>(null);
  const loadedPdbRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const autorunFiredRef = useRef(false);
  const fullscreenControlRef = useRef<{
    isFullScreen: boolean;
    toggle: () => void;
  } | null>(null);

  // ── Persistence ───────────────────────────────────────────────────────────
  const storage = useScriptingStorage(loadedId, code);

  // Seed the editor once storage is ready for the current protein. The key
  // carries `reloadToken` so an import that replaced this protein reseeds the
  // editor instead of letting the stale code auto-save back over it.
  const seedKey = `${loadedId}#${storage.reloadToken}`;

  // `void Promise.resolve().then(...)` defers the setState call to a microtask
  // so it is not synchronous within the effect body, satisfying the linter.
  useEffect(() => {
    if (!storage.storageReady) return;
    if (codeState.forId === seedKey) return;

    // Reset the autorun flag whenever we switch proteins.
    autorunFiredRef.current = false;

    const fallback = storage.loadedCode ?? defaultSceneCode(loadedId);
    let newCode: string;
    if (sceneParam) {
      const match =
        storage.scenes.find((s) => s.id === sceneParam) ??
        scenesForProtein(loadedId).find((s) => s.id === sceneParam);
      newCode = match?.code ?? fallback;
    } else {
      newCode = fallback;
    }

    void Promise.resolve().then(() => {
      setCodeState({ forId: seedKey, value: newCode });
    });
  }, [
    storage.storageReady,
    storage.loadedCode,
    loadedId,
    seedKey,
    sceneParam,
    storage.scenes,
    codeState.forId,
  ]);

  const setFullscreen = useCallback((on?: boolean) => {
    const control = fullscreenControlRef.current;
    if (!control) return;
    const desired = on === undefined ? !control.isFullScreen : on;
    if (desired !== control.isFullScreen) control.toggle();
  }, []);

  const fetchTask = useCallback(() => fetchPdbText(loadedId), [loadedId]);
  const pdbText = useAsync(fetchTask);

  useEffect(() => {
    if (pdbText.status === 'success') {
      loadedPdbRef.current = pdbText.data;
    }
  }, [pdbText]);

  useEffect(() => {
    let cancelled = false;
    void import('molstar/lib/mol-util/color/color.js').then((module_) => {
      if (cancelled) return;
      setColorModule({ Color: module_.Color });
    });
    void import('molstar/lib/mol-model/loci.js').then((module_) => {
      if (cancelled) return;
      setLociHelpers({
        getBoundingSphere: (loci) =>
          module_.Loci.getBoundingSphere(loci as never) as
            { radius: number; center: [number, number, number] } | undefined,
      });
    });
    void import('molstar/lib/mol-model/structure.js').then((module_) => {
      if (cancelled) return;
      setStructureElement({
        Loci: {
          isEmpty: (loci) =>
            module_.StructureElement.Loci.isEmpty(loci as never),
          toStructure: (loci) =>
            module_.StructureElement.Loci.toStructure(loci as never),
        },
        Bundle: {
          fromLoci: (loci) =>
            module_.StructureElement.Bundle.fromLoci(loci as never),
        },
        Location: {
          create: (structure, unit, element) =>
            module_.StructureElement.Location.create(
              structure as never,
              unit as never,
              element as never,
            ),
        },
      });
    });
    void Promise.all([import('./shapes.ts'), import('./textShape.ts')]).then(
      ([shapesModule, textShapeModule]) => {
        if (cancelled) return;
        setShapes({
          addShape: shapesModule.addShape,
          addTextShape: textShapeModule.addTextShape,
        });
      },
    );
    void Promise.all([
      import('molstar/lib/extensions/interactions/transforms.js'),
      import('molstar/lib/mol-plugin-state/transforms/model.js'),
      import('molstar/lib/mol-plugin-state/transforms/representation.js'),
      import('molstar/lib/mol-model-props/computed/interactions/interactions.js'),
      import('molstar/lib/mol-model-props/computed/interactions/common.js'),
      import('molstar/lib/mol-task/index.js'),
      import('molstar/lib/mol-util/assets.js'),
      import('molstar/lib/mol-model/structure.js'),
    ]).then(
      ([
        interactionsModule,
        modelModule,
        representationModule,
        computeInteractionsModule,
        commonModule,
        taskModule,
        assetsModule,
        structureModule,
      ]) => {
        if (cancelled) return;
        setInteractions({
          ComputeContacts: interactionsModule.ComputeContacts,
          CustomInteractions: interactionsModule.CustomInteractions,
          InteractionsShape: interactionsModule.InteractionsShape,
          MultiStructureSelectionFromBundle:
            modelModule.MultiStructureSelectionFromBundle,
          ShapeRepresentation3D: representationModule.ShapeRepresentation3D,
          computeInteractions:
            computeInteractionsModule.computeInteractions as unknown as InteractionsApi['computeInteractions'],
          AssetManager: assetsModule.AssetManager,
          Task: taskModule.Task,
          InteractionType: {
            HydrogenBond: commonModule.InteractionType.HydrogenBond,
            WeakHydrogenBond: commonModule.InteractionType.WeakHydrogenBond,
          },
          FeatureType: {
            HydrogenDonor: 4,
            HydrogenAcceptor: 5,
            WeakHydrogenDonor: 9,
          },
          /* eslint-disable camelcase -- Mol* mmCIF accessor names */
          StructureProperties: {
            chain: {
              auth_asym_id: (location) =>
                structureModule.StructureProperties.chain.auth_asym_id(
                  location as never,
                ),
            },
            residue: {
              auth_seq_id: (location) =>
                structureModule.StructureProperties.residue.auth_seq_id(
                  location as never,
                ),
            },
            atom: {
              auth_atom_id: (location) =>
                structureModule.StructureProperties.atom.auth_atom_id(
                  location as never,
                ),
            },
          },
          /* eslint-enable camelcase */
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Script execution ──────────────────────────────────────────────────────

  const handleRun = useCallback(
    async (afterReset?: () => void | Promise<void>) => {
      setScriptError(null);
      const handle = viewerHandleRef.current?.getPlugin();
      if (
        !handle ||
        !colorModule ||
        !lociHelpers ||
        !structureElement ||
        !interactions ||
        !shapes ||
        pdbText.status !== 'success'
      ) {
        setScriptError('Viewer is still initializing.');
        return;
      }
      const api = createScriptApi({
        plugin: handle.plugin,
        molScript: handle.molScript,
        colorModule,
        lociHelpers,
        structureElement,
        interactions,
        shapes,
        setEchoEntry,
        pdbText: pdbText.data,
        loadedPdbRef,
        setSwapping,
        setFullscreen,
      });
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const cancellableDelay = makeCancellableDelay(controller.signal);
      const scriptApi = makeAbortAwareApi(api, controller.signal);
      const MolStar = createMolStarClass(scriptApi);
      setStopping(false);
      setRunning(true);
      setEchoEntry(null);
      await api.reset();
      await afterReset?.();
      const { error } = await runScript({
        api: scriptApi,
        text: pdbText.data,
        MolStar,
        delay: cancellableDelay,
        body: code,
        signal: controller.signal,
      });
      abortControllerRef.current = null;
      setRunning(false);
      if (error) setScriptError(error.message);
    },
    [
      code,
      colorModule,
      lociHelpers,
      structureElement,
      interactions,
      shapes,
      pdbText,
      setFullscreen,
    ],
  );

  // Keep a stable ref to handleRun so the autorun effect can call the latest
  // version (with the correct `code` closure) without being listed as a dep.
  const handleRunRef = useRef(handleRun);
  useEffect(() => {
    handleRunRef.current = handleRun;
  }, [handleRun]);

  // Auto-run when the URL carries `?autorun=1`.
  const viewerReady =
    pdbText.status === 'success' &&
    colorModule !== null &&
    lociHelpers !== null &&
    structureElement !== null &&
    interactions !== null &&
    shapes !== null;

  // Fire the script automatically when ?autorun=1 is in the URL.
  useEffect(() => {
    if (!autorunParam || !viewerReady) return;
    if (codeState.forId !== seedKey) return; // code not yet seeded for this protein
    if (autorunFiredRef.current) return;
    autorunFiredRef.current = true;
    void handleRunRef.current();
  }, [autorunParam, viewerReady, codeState.forId, seedKey]);

  // ── Stop / record / reset ─────────────────────────────────────────────────

  const handleStop = useCallback(() => {
    setStopping(true);
    abortControllerRef.current?.abort();
    viewerHandleRef.current?.stopAnimations();
  }, []);

  const handleRecord = useCallback(async () => {
    setScriptError(null);
    const canvas = viewerHandleRef.current?.getCanvas();
    if (!canvas) {
      setScriptError('Viewer is still initializing.');
      return;
    }
    let started = false;
    try {
      await handleRun(() => {
        recording.start(canvas);
        started = true;
      });
    } catch (error) {
      setScriptError(
        error instanceof Error ? error.message : 'Recording failed to start.',
      );
    } finally {
      if (started) recording.stop();
    }
  }, [handleRun, recording]);

  const handleReset = useCallback(async () => {
    setScriptError(null);
    setEchoEntry(null);
    const handle = viewerHandleRef.current?.getPlugin();
    if (
      !handle ||
      !colorModule ||
      !lociHelpers ||
      !structureElement ||
      !interactions ||
      !shapes ||
      pdbText.status !== 'success'
    ) {
      return;
    }
    const api = createScriptApi({
      plugin: handle.plugin,
      molScript: handle.molScript,
      colorModule,
      lociHelpers,
      structureElement,
      interactions,
      shapes,
      setEchoEntry,
      pdbText: pdbText.data,
      loadedPdbRef,
      setSwapping,
      setFullscreen,
    });
    await api.reset();
  }, [
    colorModule,
    lociHelpers,
    structureElement,
    interactions,
    shapes,
    pdbText,
    setFullscreen,
  ]);

  const loadProtein = useCallback(
    (rawId: string) => {
      const trimmed = rawId.trim().toUpperCase();
      if (!trimmed) return;
      setPdbId(trimmed);
      setLoadedId(trimmed);
      setEchoEntry(null);
      setScriptError(null);
      void navigate(`/scripting/${encodeURIComponent(trimmed)}`);
    },
    [navigate],
  );

  function handleLoadPdb() {
    loadProtein(pdbId);
  }

  // ── Protein menu handlers ─────────────────────────────────────────────────

  async function handleConfirmDeleteProtein() {
    const target = deleteProteinId;
    setDeleteProteinId(null);
    if (!target) return;
    // Navigate away first when deleting the open protein: staying on it would
    // immediately re-seed its scenes and the delete would look like a no-op.
    if (target === loadedId && target !== DEFAULT_PDB_ID) {
      loadProtein(DEFAULT_PDB_ID);
    }
    await storage.removeProtein(target);
  }

  function pickScene(sceneCode: string) {
    setCode(sceneCode);
    setEchoEntry(null);
    setScriptError(null);
  }

  // ── Scene management handlers ─────────────────────────────────────────────

  async function handleAddScene() {
    const label = newSceneLabel.trim();
    if (!label) return;
    await storage.addScene(label, code);
    setNewSceneLabel('');
    setAddingScene(false);
  }

  async function handleConfirmDeleteScene() {
    if (!deleteSceneId) return;
    await storage.removeScene(deleteSceneId);
    setDeleteSceneId(null);
  }

  // ── Revision handlers ─────────────────────────────────────────────────────

  async function handleSaveRevision() {
    const label = revisionLabel.trim() || new Date().toLocaleString();
    await storage.saveRevision(label, code);
    setRevisionLabel('');
    setShowRevisions(false);
  }

  // ── Backup / restore handlers ─────────────────────────────────────────────

  async function handleExport() {
    setShowBackupMenu(false);
    await storage.exportBackup();
  }

  function handleImportClick() {
    setShowBackupMenu(false);
    importFileRef.current?.click();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    try {
      const data = await storage.importBackup(file);
      const count = new Set(data.proteinScenes.map((row) => row.pdbId)).size;
      setScriptError(null);
      setImportSummary(
        `Imported ${count} protein${count === 1 ? '' : 's'}. Proteins not in the backup were kept.`,
      );
    } catch (error) {
      setScriptError(
        error instanceof Error
          ? `Import failed: ${error.message}`
          : 'Import failed: invalid backup file.',
      );
    }
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  const sceneToDelete = storage.scenes.find((s) => s.id === deleteSceneId);

  const viewerPane = (
    <FullScreenProvider>
      {(fullscreenRef) => (
        <div ref={fullscreenRef} className="scripting-viewer-fullscreen-wrap">
          <FullscreenBridge controlRef={fullscreenControlRef} />
          <Card className="panel scripting-viewer-panel">
            {pdbText.status === 'loading' && (
              <p className="placeholder">Loading {loadedId}…</p>
            )}
            {pdbText.status === 'error' && (
              <p className="placeholder">
                Could not load {loadedId}: {pdbText.error.message}
              </p>
            )}
            {pdbText.status === 'success' && (
              <div
                className={
                  swapping
                    ? 'scripting-viewer-stack scripting-viewer-stack--swapping'
                    : 'scripting-viewer-stack'
                }
              >
                <PdbViewer
                  ref={viewerHandleRef}
                  pdb={pdbText.data}
                  representation="auto"
                  spin={false}
                  background="white"
                  onPresetApplied={(plugin) =>
                    applyScriptingLoadDefaults(plugin as PluginContext)
                  }
                />
                <EchoOverlay entry={echoEntry} />
                <FullscreenToggleButton />
              </div>
            )}
          </Card>
        </div>
      )}
    </FullScreenProvider>
  );

  const editorPane = (
    <Card className="panel scripting-editor-panel">
      <div className="scripting-editor-header">
        <strong>Script</strong>
        <ButtonGroup>
          <Button icon="help" onClick={() => setShowHelp(true)}>
            Help
          </Button>
          <Button
            icon="reset"
            onClick={() => void handleReset()}
            disabled={!viewerReady || running}
          >
            Reset
          </Button>
          <Tooltip
            content="Run the script and download a video of the animation"
            placement="bottom"
          >
            <Button
              icon="record"
              intent={Intent.DANGER}
              variant="outlined"
              onClick={() => void handleRecord()}
              disabled={!viewerReady || running}
            >
              Record
            </Button>
          </Tooltip>
          {running ? (
            <Button
              icon="stop"
              intent={Intent.DANGER}
              onClick={handleStop}
              disabled={stopping}
              loading={stopping}
            >
              {stopping ? (
                'Stopping…'
              ) : recording.recording ? (
                <span className="scripting-record-label">
                  <span className="scripting-record-dot" />
                  Stop &amp; save
                </span>
              ) : (
                'Stop'
              )}
            </Button>
          ) : (
            <Button
              icon="play"
              intent={Intent.PRIMARY}
              onClick={() => void handleRun()}
              disabled={!viewerReady}
            >
              Run
            </Button>
          )}
        </ButtonGroup>
      </div>
      <div className="scripting-editor-frame">
        <Editor value={code} onChange={setCode} height="100%" />
      </div>
      {scriptError && <pre className="scripting-error">{scriptError}</pre>}
    </Card>
  );

  return (
    <div className="scripting-page">
      <Card className="scripting-toolbar panel">
        {/* Protein loader */}
        <FormGroup
          label="PDB code"
          inline
          className="scripting-pdb-input"
          contentClassName="scripting-pdb-input-control"
        >
          <InputGroup
            value={pdbId}
            onValueChange={setPdbId}
            onKeyDown={(event) => event.key === 'Enter' && handleLoadPdb()}
            maxLength={4}
            placeholder="1ART"
            size="small"
          />
        </FormGroup>
        <Button icon="cloud-download" onClick={handleLoadPdb}>
          Load
        </Button>

        {/* Every protein that has stored scripts */}
        <ProteinMenu
          proteinIds={storage.proteinIds}
          currentPdbId={loadedId}
          onSelect={loadProtein}
          onAdd={storage.addProtein}
          onRemove={setDeleteProteinId}
        />

        <Divider />

        {/* Scene buttons — per-protein, stored in IndexedDB */}
        {storage.scenes.map((scene) => (
          <span key={scene.id} className="scripting-scene-chip">
            <Button
              variant="minimal"
              size="small"
              onClick={() => pickScene(scene.code)}
            >
              {scene.label}
            </Button>
            <Tooltip content={`Delete "${scene.label}"`} placement="bottom">
              <Button
                variant="minimal"
                size="small"
                icon="small-cross"
                className="scripting-scene-delete"
                onClick={() => setDeleteSceneId(scene.id)}
              />
            </Tooltip>
          </span>
        ))}

        {/* Add-scene control */}
        {addingScene ? (
          <InputGroup
            autoFocus
            value={newSceneLabel}
            onValueChange={setNewSceneLabel}
            placeholder="Scene name…"
            size="small"
            className="scripting-scene-input"
            rightElement={
              <ButtonGroup>
                <Button
                  size="small"
                  icon="tick"
                  intent={Intent.SUCCESS}
                  onClick={() => void handleAddScene()}
                  disabled={!newSceneLabel.trim()}
                />
                <Button
                  size="small"
                  icon="cross"
                  onClick={() => {
                    setAddingScene(false);
                    setNewSceneLabel('');
                  }}
                />
              </ButtonGroup>
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAddScene();
              if (e.key === 'Escape') {
                setAddingScene(false);
                setNewSceneLabel('');
              }
            }}
          />
        ) : (
          <Tooltip
            content="Save current script as a scene button for this protein"
            placement="bottom"
          >
            <Button
              variant="minimal"
              size="small"
              icon="add"
              onClick={() => setAddingScene(true)}
            >
              Add
            </Button>
          </Tooltip>
        )}

        <Divider />

        {/* Revision history */}
        <Popover
          isOpen={showRevisions}
          onClose={() => setShowRevisions(false)}
          placement="bottom-start"
          content={
            <div className="scripting-revisions-panel">
              <div className="scripting-revisions-save">
                <p className="scripting-revisions-hint">
                  Save a named snapshot of the current script:
                </p>
                <InputGroup
                  value={revisionLabel}
                  onValueChange={setRevisionLabel}
                  placeholder="Label (optional)…"
                  size="small"
                  rightElement={
                    <Button
                      size="small"
                      icon="floppy-disk"
                      intent={Intent.PRIMARY}
                      onClick={() => void handleSaveRevision()}
                    >
                      Save
                    </Button>
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveRevision();
                  }}
                />
              </div>
              {storage.revisions.length === 0 ? (
                <p className="scripting-revisions-empty">
                  No saved revisions yet.
                </p>
              ) : (
                <Menu className="scripting-revisions-list">
                  {storage.revisions.map((rev) => (
                    <MenuItem
                      key={rev.id}
                      text={rev.label}
                      label={new Date(rev.savedAt).toLocaleString()}
                      onClick={() => {
                        pickScene(rev.code);
                        setShowRevisions(false);
                      }}
                    />
                  ))}
                </Menu>
              )}
            </div>
          }
        >
          <Button
            variant="minimal"
            size="small"
            icon="history"
            onClick={() => setShowRevisions((v) => !v)}
          >
            Revisions
          </Button>
        </Popover>

        {/* Backup / restore */}
        <Popover
          isOpen={showBackupMenu}
          onClose={() => setShowBackupMenu(false)}
          placement="bottom-start"
          content={
            <Menu>
              <MenuItem
                icon="export"
                text="Export all data…"
                onClick={() => void handleExport()}
              />
              <MenuItem
                icon="import"
                text="Import backup…"
                onClick={handleImportClick}
              />
            </Menu>
          }
        >
          <Tooltip content="Backup and restore all scripts" placement="bottom">
            <Button
              variant="minimal"
              size="small"
              icon="database"
              onClick={() => setShowBackupMenu((v) => !v)}
            />
          </Tooltip>
        </Popover>

        {/* Hidden file input for backup import */}
        <input
          ref={importFileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => void handleImportFile(e)}
        />
      </Card>

      <div className="scripting-content">
        <Splitter left={viewerPane} right={editorPane} />
      </div>

      {showHelp && (
        <FloatingWindow
          title="Scripting reference"
          onClose={() => setShowHelp(false)}
          initialWidth={680}
          initialHeight={560}
        >
          <ScriptingHelp />
        </FloatingWindow>
      )}

      {/* Scene deletion confirmation */}
      <Alert
        isOpen={deleteSceneId !== null}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        intent={Intent.DANGER}
        icon="trash"
        onConfirm={() => void handleConfirmDeleteScene()}
        onCancel={() => setDeleteSceneId(null)}
      >
        <p>
          Delete scene <strong>&ldquo;{sceneToDelete?.label}&rdquo;</strong>?
        </p>
        <p>This cannot be undone.</p>
      </Alert>

      {/* Protein deletion confirmation */}
      <Alert
        isOpen={deleteProteinId !== null}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        intent={Intent.DANGER}
        icon="trash"
        onConfirm={() => void handleConfirmDeleteProtein()}
        onCancel={() => setDeleteProteinId(null)}
      >
        <p>
          Delete every script stored for{' '}
          <strong>{deleteProteinId ?? ''}</strong>?
        </p>
        <p>
          Its scenes, revisions and auto-saved script are removed. This cannot
          be undone — export a backup first if you want to keep them.
        </p>
      </Alert>

      {/* Import result */}
      <Alert
        isOpen={importSummary !== null}
        confirmButtonText="OK"
        intent={Intent.SUCCESS}
        icon="import"
        onConfirm={() => setImportSummary(null)}
        onClose={() => setImportSummary(null)}
      >
        <p>{importSummary}</p>
      </Alert>
    </div>
  );
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Wrap a `ScriptApi` in a Proxy that throws `AbortError` from every method
 * call once the given signal aborts. Without this, Stop only interrupts the
 * script at the next `await delay(...)`: any synchronous block in between
 * (e.g. `ms.spin(); ms.echo(...); ms.cpk();`) still runs.
 * @param api - The real script api bound to the Mol* plugin.
 * @param signal - Abort signal owned by the current run.
 * @returns A drop-in proxy with the same shape as `api`.
 */
function makeAbortAwareApi(api: ScriptApi, signal: AbortSignal): ScriptApi {
  return new Proxy(api, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        if (signal.aborted) {
          throw new DOMException('Script stopped', 'AbortError');
        }
        return Reflect.apply(
          value as (...callArgs: unknown[]) => unknown,
          target,
          args,
        );
      };
    },
  });
}

interface FullscreenControl {
  isFullScreen: boolean;
  toggle: () => void;
}

interface FullscreenBridgeProps {
  controlRef: { current: FullscreenControl | null };
}

function FullscreenBridge(props: FullscreenBridgeProps) {
  const { controlRef } = props;
  const fullscreen = useFullscreen();
  useEffect(() => {
    controlRef.current = {
      isFullScreen: fullscreen.isFullScreen,
      toggle: fullscreen.toggle,
    };
  });
  return null;
}

function FullscreenToggleButton() {
  const fullscreen = useFullscreen();
  return (
    <Tooltip
      content={fullscreen.isFullScreen ? 'Exit full screen' : 'Full screen'}
      placement="left"
    >
      <Button
        icon={fullscreen.isFullScreen ? 'minimize' : 'fullscreen'}
        variant="minimal"
        size="small"
        className="scripting-fullscreen-button"
        onClick={fullscreen.toggle}
      />
    </Tooltip>
  );
}

function makeCancellableDelay(signal: AbortSignal): Delay {
  return (seconds) =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Script stopped', 'AbortError'));
        return;
      }
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException('Script stopped', 'AbortError'));
      };
      const timer = setTimeout(
        () => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        },
        Math.max(0, seconds) * 1000,
      );
      signal.addEventListener('abort', onAbort, { once: true });
    });
}
