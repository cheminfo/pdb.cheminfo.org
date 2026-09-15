import { Button, Card, Intent, ProgressBar, Tag } from '@blueprintjs/core';
import type { ReactNode } from 'react';
import { formatBytes, formatInteger } from 'react-cheminfo/core';

import type {
  CcdSyncState,
  RsyncSubPhase,
  RsyncSyncState,
  SyncPhase,
  SyncRunningInfo,
} from '../../shared/api/types.ts';
import { formatDateTime, formatRelative } from '../../shared/format.ts';

type SyncState = RsyncSyncState | CcdSyncState;

interface SyncCardProps<TState extends SyncState> {
  state: TState | null;
  loading: boolean;
  pending: boolean;
  onTrigger: () => void;
  renderBody: (state: TState) => ReactNode;
}

/**
 * One sync card: schedule label, current state badge, last-run details,
 * and a "Sync now" button that's disabled while a run is in flight.
 * @param props - Component props.
 * @param props.state - Live state of the cron, or `null` while loading.
 * @param props.loading - Whether the initial status fetch is still pending.
 * @param props.pending - Whether the trigger POST is in flight.
 * @param props.onTrigger - Click handler that POSTs `/v1/sync/trigger`.
 * @param props.renderBody - Cron-specific body (last-run info).
 * @returns A single `.panel` representing one cron.
 */
export default function SyncCard<TState extends SyncState>({
  state,
  loading,
  pending,
  onTrigger,
  renderBody,
}: SyncCardProps<TState>) {
  if (loading || !state) {
    return (
      <Card className="panel settings-sync-card">
        <p className="placeholder">Loading…</p>
      </Card>
    );
  }

  const running = state.running;
  const queued = state.triggerQueued;
  const interval = formatInterval(state.intervalMs);
  const disabled = pending || Boolean(running) || Boolean(queued);

  return (
    <Card className="panel settings-sync-card">
      <div className="settings-sync-header">
        <h3>{state.label}</h3>
        <StateBadge running={running} queued={Boolean(queued)} />
      </div>
      <p className="settings-sync-schedule">Runs every {interval}.</p>

      {running ? (
        <p className="settings-sync-running">
          Started {formatRelative(running.startedAt)} (
          {formatDateTime(running.startedAt)}).
        </p>
      ) : queued ? (
        <p className="settings-sync-running">
          Queued {formatRelative(queued.requestedAt)}; the cron container polls
          every 5&nbsp;seconds.
        </p>
      ) : null}

      {running ? <RunningProgress running={running} /> : null}

      {renderBody(state)}

      <div className="settings-sync-actions">
        <Button
          icon="refresh"
          intent={Intent.PRIMARY}
          loading={Boolean(running) || pending}
          onClick={onTrigger}
          disabled={disabled}
        >
          {running ? 'Running…' : queued ? 'Queued' : 'Sync now'}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Live progress block rendered while a run is in flight. Combines a
 * human-readable phase label, a determinate or indeterminate progress bar
 * (depending on whether we know the total), and a counters line summarising
 * files processed, the most recent PDB id, PyMol render outcomes, and
 * rsync's own byte-level throughput.
 * @param props - Component props.
 * @param props.running - Running marker payload from `/v1/sync/status`.
 * @returns A vertically-stacked progress block, or `null` for legacy markers
 *   that lack a phase field.
 */
function RunningProgress({ running }: { running: SyncRunningInfo }) {
  const phaseLabel = describePhase(running);
  if (!phaseLabel) return null;
  const bar = computeBar(running);
  return (
    <div className="settings-sync-progress">
      <p className="settings-sync-progress-label">{phaseLabel}</p>
      <ProgressBar
        intent={Intent.PRIMARY}
        animate
        stripes={bar.value === undefined}
        value={bar.value}
      />
      <Counters running={running} />
    </div>
  );
}

function Counters({ running }: { running: SyncRunningInfo }) {
  const parts: string[] = [];
  const processed = running.processed ?? 0;
  const total = running.total;
  if (processed > 0 || total) {
    parts.push(
      total
        ? `${formatInteger(processed)} / ${formatInteger(total)} files ingested`
        : `${formatInteger(processed)} files ingested`,
    );
  }
  if (running.lastEntryId) {
    parts.push(`last ${running.lastEntryId}`);
  }
  const stats = running.renderStats;
  if (stats && stats.rendered + stats.skipped + stats.failed > 0) {
    parts.push(
      `${formatInteger(stats.rendered)} rendered · ` +
        `${formatInteger(stats.skipped)} skipped · ` +
        `${formatInteger(stats.failed)} failed`,
    );
  }
  const progress = running.rsyncProgress;
  if (progress) {
    const remaining =
      progress.filesRemaining !== undefined && progress.filesTotal !== undefined
        ? ` · ${formatInteger(progress.filesRemaining)} / ${formatInteger(progress.filesTotal)} files remaining`
        : '';
    parts.push(
      `rsync ${progress.percent}% · ${formatBytes(progress.bytesTransferred)} at ${progress.rate}${remaining}`,
    );
  }
  if (parts.length === 0) return null;
  return <p className="settings-sync-progress-counters">{parts.join(' · ')}</p>;
}

function StateBadge({
  running,
  queued,
}: {
  running: SyncRunningInfo | null;
  queued: boolean;
}) {
  if (running) {
    return <Tag intent={Intent.PRIMARY}>Running</Tag>;
  }
  if (queued) {
    return <Tag intent={Intent.WARNING}>Queued</Tag>;
  }
  return <Tag minimal>Idle</Tag>;
}

function formatInterval(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 24) {
    return `${Math.round(hours)} hour${hours === 1 ? '' : 's'}`;
  }
  const days = hours / 24;
  return `${Math.round(days)} day${days === 1 ? '' : 's'}`;
}

const PHASE_TITLES: Record<SyncPhase, string> = {
  'rebuild-asym': 'Rebuilding database from disk — asymmetric units',
  'rebuild-assembly': 'Rebuilding database from disk — biological assemblies',
  'rsync-asym': 'wwPDB rsync — asymmetric units',
  'rsync-assembly': 'wwPDB rsync — biological assemblies',
};

const SUB_PHASE_HINTS: Record<RsyncSubPhase, string> = {
  connecting: 'connecting to rsync.wwpdb.org',
  scanning: 'scanning remote archive (no transfer yet)',
  transferring: 'receiving files',
  'post-rsync': 'finalising — waiting for last files to settle',
};

function describePhase(running: SyncRunningInfo): string | null {
  if (!running.phase) return null;
  const title = PHASE_TITLES[running.phase];
  if (running.phase.startsWith('rsync-') && running.subPhase) {
    return `${title} — ${SUB_PHASE_HINTS[running.subPhase]}`;
  }
  return title;
}

function computeBar(running: SyncRunningInfo): { value: number | undefined } {
  // Rebuild phases know the total file count up front → determinate bar.
  if (
    running.phase === 'rebuild-asym' ||
    running.phase === 'rebuild-assembly'
  ) {
    const total = running.total ?? 0;
    if (total > 0) {
      return { value: Math.min(1, (running.processed ?? 0) / total) };
    }
    return { value: undefined };
  }
  // Rsync transferring phases get rsync's own byte percentage when available.
  if (running.subPhase === 'transferring' && running.rsyncProgress) {
    return { value: Math.min(1, running.rsyncProgress.percent / 100) };
  }
  // Everything else (connecting, scanning, post-rsync, missing data) shows
  // an indeterminate animated bar — proof of life, no false ETA.
  return { value: undefined };
}
