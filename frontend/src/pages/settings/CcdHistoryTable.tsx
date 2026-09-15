import { HTMLTable } from '@blueprintjs/core';
import { formatBytes, formatDuration } from 'react-cheminfo/core';

import type { CcdHistoryDoc } from '../../shared/api/types.ts';
import { formatDateTime } from '../../shared/format.ts';

interface CcdHistoryTableProps {
  rows: CcdHistoryDoc[];
}

/**
 * Compact table rendering the recent CCD-refresh history, mirroring the
 * rsync history table but with CCD-specific columns: status, imported /
 * skipped counters, and the archive size.
 * @param props - Component props.
 * @param props.rows - CCD-history rows in finished-at descending order.
 * @returns A `<table>` element, or a placeholder when the list is empty.
 */
export default function CcdHistoryTable({ rows }: CcdHistoryTableProps) {
  if (rows.length === 0) {
    return <p className="placeholder">No refreshes recorded yet.</p>;
  }
  return (
    <div className="settings-history-table-wrapper">
      <HTMLTable className="settings-history-table" compact striped>
        <thead>
          <tr>
            <th>Finished</th>
            <th>Duration</th>
            <th>Status</th>
            <th className="num">Imported</th>
            <th className="num">Skipped</th>
            <th className="num">Size</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.finishedAt}-${row.startedAt}`}>
              <td>{formatDateTime(row.finishedAt)}</td>
              <td>{formatDuration(row.durationMs)}</td>
              <td title={row.error ?? undefined}>{row.status}</td>
              <td className="num">{row.importedCount}</td>
              <td className="num">{row.skippedCount}</td>
              <td className="num">
                {formatBytes(row.bytesOnDisk ?? undefined)}
              </td>
            </tr>
          ))}
        </tbody>
      </HTMLTable>
    </div>
  );
}
