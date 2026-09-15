import { Card } from '@blueprintjs/core';
import { formatBytes, formatInteger } from 'react-cheminfo/core';

import type { DatabaseInfo, RsyncHistoryDoc } from '../../shared/api/types.ts';
import { formatDateTime, formatRelative } from '../../shared/format.ts';

interface StatsOverviewProps {
  pdb: DatabaseInfo;
  assembly: DatabaseInfo;
  /** Number of PDB entries deposited in the current calendar year. */
  thisYear: number;
  /** Most recent asym-unit rsync run, if one has been recorded. */
  lastAsymRsync: RsyncHistoryDoc | null;
  /** Most recent bio-assembly rsync run, if one has been recorded. */
  lastBioAssemblyRsync: RsyncHistoryDoc | null;
}

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <Card className="stat-card" compact>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
    </Card>
  );
}

function getDecompressedSize(info: DatabaseInfo): number {
  return info.sizes?.file ?? 0;
}

/**
 * Render the overview cards (entry counts, raw + decompressed disk usage,
 * and the timestamp of the latest asym-unit rsync run).
 * @param props - Component props.
 * @param props.pdb - Counts and decompressed-byte total for the asym archive.
 * @param props.assembly - Counts and decompressed-byte total for the bio-assembly archive.
 * @param props.thisYear - Number of entries deposited in the current calendar year.
 * @param props.lastAsymRsync - Most recent asym-unit rsync run, or `null`.
 * @param props.lastBioAssemblyRsync - Most recent bio-assembly rsync run, or `null`.
 * @returns Stats grid React element.
 */
export default function StatsOverview({
  pdb,
  assembly,
  thisYear,
  lastAsymRsync,
  lastBioAssemblyRsync,
}: StatsOverviewProps) {
  const pdbCount = pdb.doc_count ?? 0;
  const assemblyCount = assembly.doc_count ?? 0;
  const pdbDecompressed = getDecompressedSize(pdb);
  const assemblyDecompressed = getDecompressedSize(assembly);
  const pdbRaw = lastAsymRsync?.bytesOnDisk ?? null;
  const assemblyRaw = lastBioAssemblyRsync?.bytesOnDisk ?? null;
  const totalRaw = (pdbRaw ?? 0) + (assemblyRaw ?? 0);

  return (
    <div className="stats-grid">
      <StatCard
        label="PDB entries"
        value={formatInteger(pdbCount)}
        sub={`${formatBytes(pdbDecompressed)} parsed · ${formatBytes(pdbRaw ?? undefined)} raw`}
      />
      <StatCard
        label={`Added in ${new Date().getFullYear()}`}
        value={formatInteger(thisYear)}
        sub="new depositions this calendar year"
      />
      <StatCard
        label="Bio-assembly entries"
        value={formatInteger(assemblyCount)}
        sub={`${formatBytes(assemblyDecompressed)} parsed · ${formatBytes(assemblyRaw ?? undefined)} raw`}
      />
      <StatCard
        label="Raw archives on disk"
        value={formatBytes(totalRaw)}
        sub="asym-unit + bio-assembly .gz"
      />
      <StatCard
        label="Last rsync"
        value={
          lastAsymRsync
            ? formatRelative(lastAsymRsync.finishedAt) ||
              formatDateTime(lastAsymRsync.finishedAt)
            : 'never'
        }
        sub={
          lastAsymRsync
            ? `${formatInteger(lastAsymRsync.updatedCount)} new · ${formatDateTime(lastAsymRsync.finishedAt)}`
            : 'no run recorded yet'
        }
      />
    </div>
  );
}
