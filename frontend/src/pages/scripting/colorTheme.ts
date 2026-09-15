/**
 * Translate the script-facing `ColorSpec` into Mol* representation
 * parameters. We accept four shapes:
 *
 *   - a CSS color name or hex string  (e.g. 'limegreen', '#ff0080')
 *   - `{ value: 'limegreen' }`        (explicit uniform shape)
 *   - `{ model: 'chain' | 'element' | 'structure' | … }` for built-in themes
 *   - `{ color: ColorSpec, alpha: number }` for translucent variants
 */

/** Mol* built-in color theme names, exposed through a friendlier alias. */
export type ColorModel =
  | 'chain'
  | 'element'
  | 'atoms'
  | 'structure'
  | 'residue'
  | 'sequence'
  | 'hydrophobicity'
  | 'secondary-structure'
  | 'molecule-type'
  | 'uniform';

const COLOR_MODEL_TO_THEME: Record<ColorModel, string> = {
  chain: 'chain-id',
  element: 'element-symbol',
  atoms: 'element-symbol',
  structure: 'secondary-structure',
  'secondary-structure': 'secondary-structure',
  residue: 'residue-name',
  sequence: 'sequence-id',
  hydrophobicity: 'hydrophobicity',
  'molecule-type': 'molecule-type',
  uniform: 'uniform',
};

/** Inner color expression — anything except the alpha-wrapper. */
type ColorBase = string | { value: string } | { model: ColorModel };

/** Color expression accepted by the script-facing helpers. */
export type ColorSpec = ColorBase | { color: ColorBase; alpha: number };

/** Mol* representation parameters derived from a `ColorSpec`. */
export interface ColorParams {
  type: string;
  color?: string;
  colorParams?: Record<string, unknown>;
  typeParams?: Record<string, unknown>;
}

/**
 * Normalize a `ColorSpec` into Mol* representation parameters.
 * @param representationType - Mol* representation type (e.g. `'cartoon'`).
 * @param spec - Caller-provided color specification, or `undefined` to use Mol* defaults.
 * @param colorModule - Mol*'s `mol-util/color/color` module (lazy-loaded by the caller).
 * @param colorModule.Color - Mol*'s `Color` constructor: `Color(hex) => Color` (the type is a branded integer).
 * @returns Normalized representation parameters.
 */
export function buildColorParams(
  representationType: string,
  spec: ColorSpec | undefined,
  colorModule: { Color: (hex: number) => unknown },
): ColorParams {
  const result: ColorParams = { type: representationType };
  if (!spec) return result;

  if (typeof spec === 'object' && 'color' in spec) {
    Object.assign(
      result,
      buildColorParams(representationType, spec.color, colorModule),
    );
    result.typeParams = { ...result.typeParams, alpha: spec.alpha };
    return result;
  }

  if (typeof spec === 'object' && 'model' in spec) {
    result.color = COLOR_MODEL_TO_THEME[spec.model];
    // For element-symbol colouring, override Mol*'s default `carbonColor`
    // (which is `chain-id` and would tint every ligand carbon by its chain
    // — heme on chain B comes out orange, etc.) with the element-symbol
    // theme itself, so carbons render as the textbook grey alongside red
    // O, blue N, yellow S, orange Fe.
    if (spec.model === 'element' || spec.model === 'atoms') {
      result.colorParams = {
        carbonColor: { name: 'element-symbol', params: {} },
      };
    }
    return result;
  }

  const cssValue = typeof spec === 'string' ? spec : spec.value;
  const hex = parseCssColorToHex(cssValue);
  if (hex !== null) {
    result.color = 'uniform';
    // Mol* exports `Color` as a callable factory; eslint `new-cap` trips
    // on the uppercase name even though no `new` is intended.
    // eslint-disable-next-line new-cap -- Mol* exports `Color` as a callable factory
    result.colorParams = { value: colorModule.Color(hex) };
  }
  return result;
}

/**
 * Parse a CSS color name or hex string into a 24-bit integer for Mol*'s
 * `Color.fromHex`. Returns `null` if the value is not recognized.
 * @param value - CSS color name or hex string.
 * @returns 24-bit integer, or `null` if unrecognized.
 */
export function parseCssColorToHex(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    if (/^[0-9a-f]{6}$/.test(hex)) return Number.parseInt(hex, 16);
    const shortMatch = /^(?<r>[0-9a-f])(?<g>[0-9a-f])(?<b>[0-9a-f])$/.exec(hex);
    if (shortMatch?.groups) {
      const { r, g, b } = shortMatch.groups;
      return Number.parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
    }
    return null;
  }
  return CSS_NAMED_COLORS[normalized] ?? null;
}

/**
 * Subset of CSS named colors needed by the demonstration scenes. Extended
 * lazily — every color used in a scene must appear here.
 */
const CSS_NAMED_COLORS: Record<string, number> = {
  black: 0x000000,
  white: 0xffffff,
  red: 0xff0000,
  green: 0x008000,
  blue: 0x0000ff,
  yellow: 0xffff00,
  cyan: 0x00ffff,
  magenta: 0xff00ff,
  orange: 0xffa500,
  purple: 0x800080,
  pink: 0xffc0cb,
  gray: 0x808080,
  grey: 0x808080,
  lightgray: 0xd3d3d3,
  lightgrey: 0xd3d3d3,
  limegreen: 0x32cd32,
  lime: 0x00ff00,
  navy: 0x000080,
  teal: 0x008080,
  brown: 0xa52a2a,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  salmon: 0xfa8072,
  skyblue: 0x87ceeb,
  steelblue: 0x4682b4,
  crimson: 0xdc143c,
  mediumseagreen: 0x3cb371,
  mediumpurple: 0x9370db,
};
