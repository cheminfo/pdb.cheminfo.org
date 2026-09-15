import { formatInteger } from 'react-cheminfo/core';
import { useNavigate } from 'react-router';

import { fetchHelicesVsSheets } from '../../shared/api/client.ts';
import Panel from '../../shared/charts/Panel.tsx';
import { browseHref } from '../../shared/charts/browseLink.ts';
import { useAsync } from '../../shared/useAsync.ts';

const BINS = [0, 1, 5, 10, 20, 50] as const;
const BIN_LABELS = ['0', '1–4', '5–9', '10–19', '20–49', '≥50'];
// Inclusive (min, max) for each bin. `null` upper means "open-ended".
const BIN_RANGES: Array<[number, number | null]> = [
  [0, 0],
  [1, 4],
  [5, 9],
  [10, 19],
  [20, 49],
  [50, null],
];
const CELL = 44;
const MARGIN_LEFT = 56;
const MARGIN_BOTTOM = 30;
const MARGIN_TOP = 20;
const MARGIN_RIGHT = 20;

function bin(value: number): number {
  for (let index = BINS.length - 1; index >= 0; index--) {
    const lower = BINS[index];
    if (lower !== undefined && value >= lower) return index;
  }
  return 0;
}

/**
 * Render a 2-D heatmap counting how many entries have each
 * `[nbHelices, nbSheets]` pair. Both axes are bucketed into 6 size classes
 * (0, 1–4, 5–9, 10–19, 20–49, ≥50) so the matrix stays a manageable 6×6.
 * Implemented as a hand-rolled SVG to avoid pulling in `@nivo/heatmap`
 * just for one chart.
 * @returns Panel React element with the heatmap.
 */
export default function HelicesVsSheetsChart() {
  const state = useAsync(fetchHelicesVsSheets);
  const navigate = useNavigate();
  return (
    <Panel
      title="Helices vs sheets per entry"
      description="2-D distribution: how many entries fall into each (helix-count, sheet-count) bucket. Click a cell to browse that combination."
      state={state}
      errorPrefix="Could not load helices/sheets matrix"
    >
      {(data) => {
        const matrix: number[][] = Array.from({ length: BINS.length }, () =>
          Array.from({ length: BINS.length }, () => 0),
        );
        let max = 0;
        for (const row of data.rows) {
          const [helices, sheets] = row.key;
          const helixIndex = bin(helices);
          const sheetIndex = bin(sheets);
          const cell = (matrix[helixIndex] ??= [])[sheetIndex] ?? 0;
          const next = cell + row.value;
          matrix[helixIndex][sheetIndex] = next;
          if (next > max) max = next;
        }
        const width = MARGIN_LEFT + MARGIN_RIGHT + CELL * BIN_LABELS.length + 4;
        const height =
          MARGIN_TOP + MARGIN_BOTTOM + CELL * BIN_LABELS.length + 4;
        return (
          <div style={{ overflow: 'auto' }}>
            <svg width={width} height={height} role="img">
              <text
                x={MARGIN_LEFT - 12}
                y={MARGIN_TOP + (CELL * BIN_LABELS.length) / 2}
                textAnchor="middle"
                transform={`rotate(-90, ${MARGIN_LEFT - 32}, ${
                  MARGIN_TOP + (CELL * BIN_LABELS.length) / 2
                })`}
                fontSize={11}
                fill="#64748b"
              >
                Helices per entry
              </text>
              <text
                x={MARGIN_LEFT + (CELL * BIN_LABELS.length) / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize={11}
                fill="#64748b"
              >
                Sheets per entry
              </text>
              {BIN_LABELS.map((label, index) => (
                <text
                  key={`x-${label}`}
                  x={MARGIN_LEFT + index * CELL + CELL / 2}
                  y={MARGIN_TOP + CELL * BIN_LABELS.length + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#64748b"
                >
                  {label}
                </text>
              ))}
              {BIN_LABELS.map((label, index) => (
                <text
                  key={`y-${label}`}
                  x={MARGIN_LEFT - 6}
                  y={
                    MARGIN_TOP +
                    (BIN_LABELS.length - 1 - index) * CELL +
                    CELL / 2 +
                    3
                  }
                  textAnchor="end"
                  fontSize={10}
                  fill="#64748b"
                >
                  {label}
                </text>
              ))}
              {matrix.map((row, helixIndex) =>
                row.map((value, sheetIndex) => {
                  const intensity = max > 0 ? value / max : 0;
                  const x = MARGIN_LEFT + sheetIndex * CELL;
                  const y =
                    MARGIN_TOP + (BIN_LABELS.length - 1 - helixIndex) * CELL;
                  const helixLabel = BIN_LABELS[helixIndex];
                  const sheetLabel = BIN_LABELS[sheetIndex];
                  const helixRange = BIN_RANGES[helixIndex];
                  const sheetRange = BIN_RANGES[sheetIndex];
                  const onCellClick =
                    helixRange && sheetRange
                      ? () => {
                          void navigate(
                            browseHref({
                              helicesMin: helixRange[0],
                              helicesMax: helixRange[1] ?? undefined,
                              sheetsMin: sheetRange[0],
                              sheetsMax: sheetRange[1] ?? undefined,
                            }),
                          );
                        }
                      : undefined;
                  return (
                    <g
                      key={`h${helixLabel}-s${sheetLabel}`}
                      onClick={onCellClick}
                      style={{ cursor: onCellClick ? 'pointer' : undefined }}
                    >
                      <rect
                        x={x + 1}
                        y={y + 1}
                        width={CELL - 2}
                        height={CELL - 2}
                        rx={3}
                        ry={3}
                        fill={cellColor(intensity)}
                        stroke="#e2e8f0"
                      />
                      <text
                        x={x + CELL / 2}
                        y={y + CELL / 2 + 4}
                        textAnchor="middle"
                        fontSize={11}
                        fill={intensity > 0.55 ? '#ffffff' : '#0f172a'}
                      >
                        {value > 0 ? formatInteger(value) : ''}
                      </text>
                    </g>
                  );
                }),
              )}
            </svg>
          </div>
        );
      }}
    </Panel>
  );
}

function cellColor(intensity: number): string {
  if (intensity <= 0) return '#f8fafc';
  const lightness = Math.round(96 - intensity * 50);
  return `hsl(217, 91%, ${lightness}%)`;
}
