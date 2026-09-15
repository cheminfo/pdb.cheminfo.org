import { ResponsiveBar } from '@nivo/bar';
import { formatCompact, formatInteger } from 'react-cheminfo/core';
import { useNavigate } from 'react-router';

import { fetchMethodByYear } from '../../shared/api/client.ts';
import Panel from '../../shared/charts/Panel.tsx';
import { browseHref } from '../../shared/charts/browseLink.ts';
import { methodColor } from '../../shared/charts/methodColors.ts';
import { chartTheme, pickEveryNth } from '../../shared/charts/theme.ts';
import { useAsync } from '../../shared/useAsync.ts';

const TOP_METHODS = 5;

interface YearDatum {
  year: string;
  [method: string]: string | number;
}

/**
 * Render a stacked bar chart of structures deposited per year, broken
 * down by experimental method. Methods outside the global top
 * `TOP_METHODS` are folded into a single `Other` series so the legend
 * stays readable. Clicking a bar segment filters Browse to that year and
 * method (the `Other` segment only filters by year, since the underlying
 * set is heterogeneous).
 * @returns Panel React element with the chart.
 */
export default function MethodByYearChart() {
  const state = useAsync(fetchMethodByYear);
  const navigate = useNavigate();
  return (
    <Panel
      title="Methods over time"
      description="Yearly deposition counts split by the top experimental methods. Click a segment to browse that year and method."
      state={state}
      errorPrefix="Could not load method-by-year breakdown"
    >
      {(data) => {
        const totalsByMethod = new Map<string, number>();
        for (const row of data.rows) {
          const method = row.key[1];
          totalsByMethod.set(
            method,
            (totalsByMethod.get(method) ?? 0) + row.value,
          );
        }
        const topMethods = Array.from(totalsByMethod.entries())
          .toSorted(([, leftTotal], [, rightTotal]) => rightTotal - leftTotal)
          .slice(0, TOP_METHODS)
          .map(([name]) => name);
        const topSet = new Set(topMethods);

        const byYear = new Map<number, YearDatum>();
        for (const row of data.rows) {
          const [year, method] = row.key;
          if (!Number.isFinite(year) || year < 1970) continue;
          let datum = byYear.get(year);
          if (!datum) {
            datum = { year: String(year) };
            for (const name of topMethods) datum[name] = 0;
            datum.Other = 0;
            byYear.set(year, datum);
          }
          const bucket = topSet.has(method) ? method : 'Other';
          datum[bucket] = ((datum[bucket] as number) ?? 0) + row.value;
        }
        const chartData = Array.from(byYear.entries())
          .toSorted(([leftYear], [rightYear]) => leftYear - rightYear)
          .map(([, datum]) => datum);
        if (chartData.length === 0) {
          return <p className="placeholder">No data.</p>;
        }
        const keys = [...topMethods, 'Other'];
        const colors: string[] = keys.map((key) => methodColor(key));

        return (
          <div style={{ height: 320, cursor: 'pointer' }}>
            <ResponsiveBar
              data={chartData}
              keys={keys}
              indexBy="year"
              margin={{ top: 8, right: 24, bottom: 80, left: 56 }}
              padding={0.2}
              colors={colors}
              borderRadius={1}
              enableLabel={false}
              onClick={(bar) => {
                const year = String(bar.indexValue);
                const method = String(bar.id);
                void navigate(
                  browseHref({
                    yearMin: year,
                    yearMax: year,
                    methods: method === 'Other' ? undefined : method,
                  }),
                );
              }}
              axisBottom={{
                tickSize: 4,
                tickPadding: 6,
                tickRotation: 0,
                tickValues: pickEveryNth(
                  chartData.map((row) => row.year),
                  8,
                ),
              }}
              axisLeft={{
                tickSize: 4,
                tickPadding: 6,
                format: (value: number) => formatCompact(value),
              }}
              gridYValues={4}
              theme={chartTheme}
              legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'bottom',
                  direction: 'row',
                  translateY: 64,
                  itemWidth: 130,
                  itemHeight: 14,
                  symbolSize: 10,
                  itemTextColor: '#475569',
                  itemDirection: 'left-to-right',
                  toggleSerie: true,
                },
              ]}
              tooltip={({ id, indexValue, value }) => (
                <div className="chart-tooltip">
                  <strong>
                    {indexValue} · {String(id)}
                  </strong>
                  : {formatInteger(value)}
                </div>
              )}
              animate={false}
            />
          </div>
        );
      }}
    </Panel>
  );
}
