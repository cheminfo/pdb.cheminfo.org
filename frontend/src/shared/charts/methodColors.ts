import { CHART_SERIES_COLORS } from 'react-cheminfo/core';

/**
 * Where each experimental method reads the family's colour-blind-safe series
 * palette. Keyed by method rather than by rank so a method keeps its colour
 * from one chart to the next, and from one year's top five to another's.
 *
 * The neutral (last) entry is reserved for the `Other` bucket, so a method
 * never takes the colour that means "everything else".
 */
const METHOD_COLOR_INDEX: Record<string, number> = {
  'X-RAY DIFFRACTION': 0,
  'ELECTRON MICROSCOPY': 2,
  'SOLUTION NMR': 4,
  'SOLID-STATE NMR': 1,
  'NEUTRON DIFFRACTION': 3,
  'FIBER DIFFRACTION': 5,
  'POWDER DIFFRACTION': 6,
  'ELECTRON CRYSTALLOGRAPHY': 2,
  'SOLUTION SCATTERING': 1,
};

const OTHER_INDEX = CHART_SERIES_COLORS.length - 1;

/** The grey an `Other` bucket is drawn in, on every chart that folds one. */
export const OTHER_METHOD_COLOR = CHART_SERIES_COLORS[OTHER_INDEX] ?? '#4d4d4d';

/**
 * The colour a method is drawn in.
 * @param method - Experimental method as the API reports it, or `Other`.
 * @returns A six-digit hex colour from the shared series palette.
 */
export function methodColor(method: string): string {
  const index = METHOD_COLOR_INDEX[method];
  if (index === undefined) return OTHER_METHOD_COLOR;
  return CHART_SERIES_COLORS[index] ?? OTHER_METHOD_COLOR;
}
