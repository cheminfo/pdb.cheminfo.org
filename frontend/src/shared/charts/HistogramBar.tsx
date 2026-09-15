import { ResponsiveBar } from '@nivo/bar';
import { formatCompact, formatInteger } from 'react-cheminfo/core';

import { chartAccent, chartTheme } from './theme.ts';

interface HistogramBarProps {
  /** Pre-sorted data, where `index` is the categorical x-label. */
  data: Array<{ index: string; count: number }>;
  /**
   * Layout direction. Vertical ('row') is the default; horizontal ('column')
   * is convenient for ranked top-N bars where labels would be too long to
   * fit on the X axis.
   * @default 'vertical'
   */
  layout?: 'vertical' | 'horizontal';
  /** Override the bar colour (single-series). */
  color?: string;
  /** Number of axis grid lines on the value axis. */
  gridValues?: number;
  /**
   * Subset of `index` values to keep as ticks. Use to thin out the axis when
   * data has many categories.
   */
  axisTickValues?: string[];
  /**
   * Total chart height in pixels (the parent must give the container a
   * height; the chart fills it).
   * @default 260
   */
  height?: number;
  /**
   * Optional override for the bottom margin (gives room for rotated labels).
   * @default 40
   */
  marginBottom?: number;
  /** Pixels reserved for the left axis labels (horizontal layout). */
  marginLeft?: number;
  /** Tick rotation on the bottom axis (degrees). */
  rotateBottom?: number;
  /**
   * Custom unit shown in the tooltip after the value. e.g. ' structures'.
   * @default ' structures'
   */
  valueLabel?: string;
  /**
   * If provided, bars become interactive: the cursor turns into a pointer and
   * a click reports the bar's `index` value. Used by stats charts to deep-link
   * into Browse.
   */
  onBarClick?: (index: string) => void;
}

interface HistogramDatum {
  index: string;
  count: number;
  [key: string]: string | number;
}

/**
 * Single-series bar chart used for every histogram on the stats page. Wraps
 * `@nivo/bar` with the project's chart theme, sensible defaults, and a
 * tooltip shaped like `<index>: <count> <valueLabel>`.
 * @param props - Chart props.
 * @returns Bar chart React element, or a placeholder if `data` is empty.
 */
export default function HistogramBar(props: HistogramBarProps) {
  const {
    data,
    layout = 'vertical',
    color = chartAccent,
    gridValues = 4,
    axisTickValues,
    height = 260,
    marginBottom,
    marginLeft,
    rotateBottom = 0,
    valueLabel = ' structures',
    onBarClick,
  } = props;

  if (data.length === 0) {
    return <p className="placeholder">No data.</p>;
  }

  const isHorizontal = layout === 'horizontal';
  const chartData: HistogramDatum[] = data;

  return (
    <div style={{ height, cursor: onBarClick ? 'pointer' : undefined }}>
      <ResponsiveBar
        data={chartData}
        keys={['count']}
        indexBy="index"
        layout={isHorizontal ? 'horizontal' : 'vertical'}
        onClick={
          onBarClick ? (bar) => onBarClick(String(bar.indexValue)) : undefined
        }
        margin={{
          top: 8,
          right: isHorizontal ? 24 : 16,
          bottom: marginBottom ?? (isHorizontal ? 32 : 40),
          left: marginLeft ?? (isHorizontal ? 140 : 56),
        }}
        padding={isHorizontal ? 0.25 : 0.2}
        colors={[color]}
        borderRadius={2}
        enableLabel={false}
        axisBottom={{
          tickSize: 4,
          tickPadding: 6,
          tickRotation: rotateBottom,
          ...(isHorizontal
            ? { format: (value: number) => formatCompact(value) }
            : axisTickValues
              ? { tickValues: axisTickValues }
              : {}),
        }}
        axisLeft={{
          tickSize: 4,
          tickPadding: 6,
          ...(isHorizontal
            ? {}
            : { format: (value: number) => formatCompact(value) }),
        }}
        gridYValues={isHorizontal ? undefined : gridValues}
        gridXValues={isHorizontal ? gridValues : undefined}
        theme={chartTheme}
        tooltip={({ indexValue, value }) => (
          <div className="chart-tooltip">
            <strong>{indexValue}</strong>: {formatInteger(value)}
            {valueLabel}
          </div>
        )}
        animate={false}
      />
    </div>
  );
}
