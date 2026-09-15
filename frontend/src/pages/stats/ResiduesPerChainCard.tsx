import { formatInteger } from 'react-cheminfo/core';

import { fetchResiduesPerChainStats } from '../../shared/api/client.ts';
import Panel from '../../shared/charts/Panel.tsx';
import { useAsync } from '../../shared/useAsync.ts';

/**
 * Render a small card summarising the average / min / max residues per
 * chain across the whole DB. Single-line stats only — there are not
 * enough useful buckets to justify a full histogram.
 * @returns Panel React element with min / mean / max lines.
 */
export default function ResiduesPerChainCard() {
  const state = useAsync(fetchResiduesPerChainStats);
  return (
    <Panel
      title="Residues per chain"
      description="Aggregate min / mean / max residues per chain across all entries."
      state={state}
      errorPrefix="Could not load residues-per-chain stats"
    >
      {(data) => {
        const stats = data.rows[0]?.value;
        if (!stats || stats.count === 0) {
          return <p className="placeholder">No data.</p>;
        }
        const mean = stats.sum / stats.count;
        return (
          <ul className="stats-list">
            <li>
              <span>Mean</span>
              <strong>{formatInteger(Math.round(mean))}</strong>
            </li>
            <li>
              <span>Min</span>
              <strong>{formatInteger(Math.round(stats.min))}</strong>
            </li>
            <li>
              <span>Max</span>
              <strong>{formatInteger(Math.round(stats.max))}</strong>
            </li>
            <li>
              <span>Entries</span>
              <strong>{formatInteger(stats.count)}</strong>
            </li>
          </ul>
        );
      }}
    </Panel>
  );
}
