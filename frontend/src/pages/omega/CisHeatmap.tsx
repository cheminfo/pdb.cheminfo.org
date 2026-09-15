import { formatDecimal, formatInteger } from 'react-cheminfo/core';
import { ColorScaleLegend } from 'react-cheminfo/ui';

import type { PairFrequencyResponse } from '../../shared/api/types.ts';

import type { AminoAcid } from './aminoAcids.ts';
import { AA_ONE_LETTER, STANDARD_AA } from './aminoAcids.ts';

const CELL = 26;
const MARGIN_LEFT = 36;
const MARGIN_TOP = 28;
const MARGIN_RIGHT = 24;
const MARGIN_BOTTOM = 28;
// Pairs with fewer than this many observations get a hatched/grey cell — the
// per-pair probability is too noisy to trust on a single-digit denominator.
const MIN_OBSERVATIONS = 3;

interface CisHeatmapProps {
  /** Per-pair `[nbCis, nbTotal]` tuples keyed by `[residue1, residue2]`. */
  pairs: PairFrequencyResponse;
}

/**
 * 20 × 20 amino-acid heatmap of cis-bond probability. Rows are residue 1 (the
 * residue contributing the C-terminus of the peptide bond), columns are
 * residue 2 (the residue contributing the N-terminus, i.e. the one that goes
 * cis when proline). Each cell shows `nbCis(r1,r2) / nbTotal(r1,r2)`.
 *
 * Cells with fewer than 3 observations are rendered grey: the probability is
 * too noisy to read.
 * @param props - Component props.
 * @param props.pairs - Per-pair `[nbCis, nbTotal]` tuples keyed by `[residue1, residue2]`.
 * @returns SVG heatmap React element.
 */
export default function CisHeatmap({ pairs }: CisHeatmapProps) {
  const pairMap = pairsToMap(pairs);

  let maxProbability = 0;
  for (let row = 0; row < STANDARD_AA.length; row++) {
    for (let col = 0; col < STANDARD_AA.length; col++) {
      const [cisValue, totalValue] = lookup(pairMap, row, col);
      if (totalValue < MIN_OBSERVATIONS) continue;
      const probability = cisValue / totalValue;
      if (probability > maxProbability) maxProbability = probability;
    }
  }

  const width = MARGIN_LEFT + MARGIN_RIGHT + CELL * STANDARD_AA.length;
  const height = MARGIN_TOP + MARGIN_BOTTOM + CELL * STANDARD_AA.length;

  return (
    <div className="omega-heatmap-wrap">
      <svg width={width} height={height} role="img">
        <text
          x={MARGIN_LEFT - 28}
          y={MARGIN_TOP + (CELL * STANDARD_AA.length) / 2}
          textAnchor="middle"
          transform={`rotate(-90, ${MARGIN_LEFT - 28}, ${
            MARGIN_TOP + (CELL * STANDARD_AA.length) / 2
          })`}
          fontSize={11}
          fill="#64748b"
        >
          Residue i (Cα–C)
        </text>
        <text
          x={MARGIN_LEFT + (CELL * STANDARD_AA.length) / 2}
          y={height - 8}
          textAnchor="middle"
          fontSize={11}
          fill="#64748b"
        >
          Residue i+1 (N–Cα)
        </text>

        {STANDARD_AA.map((residue, index) => (
          <text
            key={`x-${residue}`}
            x={MARGIN_LEFT + index * CELL + CELL / 2}
            y={MARGIN_TOP - 8}
            textAnchor="middle"
            fontSize={10}
            fill="#475569"
          >
            {AA_ONE_LETTER[residue]}
          </text>
        ))}
        {STANDARD_AA.map((residue, index) => (
          <text
            key={`y-${residue}`}
            x={MARGIN_LEFT - 6}
            y={MARGIN_TOP + index * CELL + CELL / 2 + 3}
            textAnchor="end"
            fontSize={10}
            fill="#475569"
          >
            {AA_ONE_LETTER[residue]}
          </text>
        ))}

        {STANDARD_AA.map((rowResidue, rowIndex) =>
          STANDARD_AA.map((colResidue, colIndex) => {
            const [cisValue, totalValue] = lookup(pairMap, rowIndex, colIndex);
            const x = MARGIN_LEFT + colIndex * CELL;
            const y = MARGIN_TOP + rowIndex * CELL;
            const probability = totalValue > 0 ? cisValue / totalValue : 0;
            const intensity =
              totalValue >= MIN_OBSERVATIONS && maxProbability > 0
                ? probability / maxProbability
                : null;
            const tooltip =
              totalValue === 0
                ? `${rowResidue}-${colResidue}: no observations`
                : `${rowResidue}-${colResidue}: ${cisValue}/${formatInteger(totalValue)} = ${formatDecimal(probability * 100, 2)} % cis`;
            return (
              <g key={`${rowResidue}-${colResidue}`}>
                <rect
                  x={x + 0.5}
                  y={y + 0.5}
                  width={CELL - 1}
                  height={CELL - 1}
                  fill={cellColor(intensity)}
                  stroke="#e2e8f0"
                >
                  <title>{tooltip}</title>
                </rect>
              </g>
            );
          }),
        )}
      </svg>
      <ColorScale max={maxProbability} />
    </div>
  );
}

function pairsToMap(
  response: PairFrequencyResponse,
): Map<string, [number, number]> {
  const map = new Map<string, [number, number]>();
  for (const row of response.rows) {
    const [residue1, residue2] = row.key;
    map.set(`${residue1}:${residue2}`, row.value);
  }
  return map;
}

const EMPTY_PAIR: [number, number] = [0, 0];

function lookup(
  map: Map<string, [number, number]>,
  row: number,
  col: number,
): [number, number] {
  const r1 = STANDARD_AA[row] as AminoAcid;
  const r2 = STANDARD_AA[col] as AminoAcid;
  return map.get(`${r1}:${r2}`) ?? EMPTY_PAIR;
}

function cellColor(intensity: number | null): string {
  if (intensity === null) return '#f1f5f9';
  if (intensity <= 0) return '#f8fafc';
  const lightness = Math.round(96 - intensity * 60);
  return `hsl(0, 75%, ${lightness}%)`;
}

/** The heatmap's own ramp, sampled for the legend. */
const SCALE_STOPS = [0, 0.25, 0.5, 0.75, 1].map((stop) => cellColor(stop));

interface ColorScaleProps {
  max: number;
}

function ColorScale({ max }: ColorScaleProps) {
  if (max <= 0) {
    return <p className="omega-scale-empty">No cis bonds in this range.</p>;
  }
  return (
    <div className="omega-scale">
      <ColorScaleLegend
        scale={SCALE_STOPS}
        min={0}
        max={max * 100}
        unit="%"
        formatValue={(value) => formatDecimal(value, 2)}
      />
    </div>
  );
}
