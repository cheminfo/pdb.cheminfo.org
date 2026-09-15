import { ResponsiveBar } from '@nivo/bar';
import { formatCompact, formatInteger } from 'react-cheminfo/core';

import type { ViewResponse } from '../../shared/api/types.ts';
import { chartAccent, chartTheme } from '../../shared/charts/theme.ts';

interface ExperimentChartProps {
  data: ViewResponse<string>;
}

interface ExperimentDatum {
  method: string;
  count: number;
  [key: string]: string | number;
}

/**
 * Render the top-N horizontal bar chart of experimental methods.
 * @param props - Component props.
 * @param props.data - View response with one row per experimental method.
 * @returns Bar chart React element.
 */
export default function ExperimentChart({ data }: ExperimentChartProps) {
  const chartData: ExperimentDatum[] = data.rows
    .filter((row): row is { key: string; value: number } => Boolean(row.key))
    .toSorted((left, right) => right.value - left.value)
    .slice(0, 8)
    .toReversed()
    .map((row) => ({ method: prettyMethod(row.key), count: row.value }));

  if (chartData.length === 0) {
    return <p className="placeholder">No data.</p>;
  }

  return (
    <div style={{ height: 260 }}>
      <ResponsiveBar
        data={chartData}
        keys={['count']}
        indexBy="method"
        layout="horizontal"
        margin={{ top: 8, right: 24, bottom: 32, left: 160 }}
        padding={0.25}
        colors={[chartAccent]}
        borderRadius={2}
        enableLabel={false}
        axisBottom={{
          tickSize: 4,
          tickPadding: 6,
          format: (value: number) => formatCompact(value),
        }}
        axisLeft={{
          tickSize: 4,
          tickPadding: 6,
        }}
        gridXValues={4}
        theme={chartTheme}
        tooltip={({ indexValue, value }) => (
          <div className="chart-tooltip">
            <strong>{indexValue}</strong>: {formatInteger(value)} structures
          </div>
        )}
        animate={false}
      />
    </div>
  );
}

function prettyMethod(method: string): string {
  return method
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      const first = word.charAt(0);
      return first ? first.toUpperCase() + word.slice(1) : word;
    })
    .join(' ');
}
