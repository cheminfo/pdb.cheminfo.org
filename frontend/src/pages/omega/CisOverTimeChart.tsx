import { ResponsiveBar } from '@nivo/bar';
import { formatDecimal, formatInteger } from 'react-cheminfo/core';

import type { OmegaByYearResponse } from '../../shared/api/types.ts';
import {
  chartAccent,
  chartTheme,
  pickEveryNth,
} from '../../shared/charts/theme.ts';

interface CisOverTimeChartProps {
  /** Per-year ω totals (rows of `omegaByYear`). */
  data: OmegaByYearResponse;
  /** Optional `[minYear, maxYear]` range to highlight in the chart. */
  highlightRange?: [number, number];
}

/**
 * Bar chart of cis-bond percentage per deposition year. Useful for spotting
 * whether old structures simply did not encode cis amide bonds (the historical
 * concern that motivated this view). Bars outside the highlighted range are
 * dimmed.
 * @param props - Component props.
 * @param props.data - Per-year ω totals (rows of `omegaByYear`).
 * @param props.highlightRange - Optional `[minYear, maxYear]` range to emphasise.
 * @returns Chart React element wrapped in a fixed-height container.
 */
export default function CisOverTimeChart({
  data,
  highlightRange,
}: CisOverTimeChartProps) {
  const sorted = data.rows
    .filter(
      (row) => Number.isFinite(row.key) && row.key >= 1970 && row.value[3] > 0,
    )
    .toSorted((left, right) => left.key - right.key);

  if (sorted.length === 0) {
    return <p className="placeholder">No data.</p>;
  }

  const chartData = sorted.map((row) => {
    const [nbCis, , , nbBonds] = row.value;
    return {
      index: String(row.key),
      percentage: Number(((nbCis / nbBonds) * 100).toFixed(3)),
      year: row.key,
      nbCis,
      nbBonds,
    };
  });

  const isHighlighted = (year: number) =>
    !highlightRange || (year >= highlightRange[0] && year <= highlightRange[1]);

  return (
    <div style={{ height: 280 }}>
      <ResponsiveBar
        data={chartData}
        keys={['percentage']}
        indexBy="index"
        margin={{ top: 8, right: 16, bottom: 40, left: 56 }}
        padding={0.2}
        colors={({ data: row }) =>
          isHighlighted(row.year) ? chartAccent : '#cbd5e1'
        }
        borderRadius={2}
        enableLabel={false}
        axisBottom={{
          tickSize: 4,
          tickPadding: 6,
          tickValues: pickEveryNth(
            chartData.map((row) => row.index),
            8,
          ),
        }}
        axisLeft={{
          tickSize: 4,
          tickPadding: 6,
          format: (value: number) => `${value} %`,
        }}
        gridYValues={4}
        theme={chartTheme}
        tooltip={({ data: row }) => (
          <div className="chart-tooltip">
            <strong>{row.index}</strong>: {formatDecimal(row.percentage, 2)} %
            cis ({formatInteger(row.nbCis)} / {formatInteger(row.nbBonds)})
          </div>
        )}
        animate={false}
      />
    </div>
  );
}
