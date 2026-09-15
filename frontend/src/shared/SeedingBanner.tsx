import { useEffect, useState } from 'react';
import { formatInteger } from 'react-cheminfo/core';

import { fetchSyncStatus } from './api/client.ts';
import type {
  SyncPhase,
  SyncRunningInfo,
  SyncStatusResponse,
} from './api/types.ts';

const POLL_INTERVAL_RUNNING_MS = 2_000;
const POLL_INTERVAL_IDLE_MS = 30_000;

const CCD_LABEL = 'Seeding Chemical Component Dictionary (first boot)';

const PHASE_LABELS: Record<SyncPhase, string> = {
  'rebuild-asym':
    'Seeding asymmetric-unit metadata from on-disk archive (first boot)',
  'rebuild-assembly':
    'Seeding biological-assembly metadata from on-disk archive (first boot)',
  'rsync-asym': 'Syncing asymmetric units from wwPDB',
  'rsync-assembly': 'Syncing biological assemblies from wwPDB',
};

/**
 * Persistent banner that appears whenever the cron container is actively
 * working — first-boot rebuild from disk or the periodic wwPDB rsync. Polls
 * `/v1/sync/status` every 2 s while running and every 30 s when idle. Kept
 * out of the way (a single thin strip below the navbar) so it doesn't push
 * page content around once the seed completes.
 * @returns The banner React element, or null when no work is in flight.
 */
export default function SeedingBanner() {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      fetchSyncStatus().then(
        (next) => {
          if (cancelled) return;
          setStatus(next);
          const isRunning = Boolean(next.rsync.running || next.ccd.running);
          const nextDelay = isRunning
            ? POLL_INTERVAL_RUNNING_MS
            : POLL_INTERVAL_IDLE_MS;
          timer = setTimeout(tick, nextDelay);
        },
        () => {
          if (cancelled) return;
          timer = setTimeout(tick, POLL_INTERVAL_IDLE_MS);
        },
      );
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Rsync / rebuild work takes precedence over CCD because it carries the
  // richer progress payload. CCD is shown only when nothing else is active.
  const running: SyncRunningInfo | null =
    status?.rsync.running ?? status?.ccd.running ?? null;

  if (!running) return null;
  const label =
    running.type === 'ccd'
      ? CCD_LABEL
      : running.phase
        ? PHASE_LABELS[running.phase]
        : null;
  if (!label) return null;
  const processed = running.processed ?? 0;
  const total = running.total;
  const percent =
    typeof total === 'number' && total > 0
      ? Math.min(100, Math.round((processed / total) * 100))
      : null;
  const counter =
    typeof total === 'number' && total > 0
      ? `${formatInteger(processed)} / ${formatInteger(total)}`
      : `${formatInteger(processed)} files`;

  return (
    <div
      className="seeding-banner"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="seeding-banner-row">
        <span className="seeding-banner-label">{label}</span>
        <span className="seeding-banner-counter">
          {counter}
          {percent !== null ? ` (${percent}%)` : ''}
          {running.lastEntryId ? ` · last: ${running.lastEntryId}` : ''}
          {running.renderStats
            ? ` · pymol: ${formatInteger(running.renderStats.rendered)} rendered, ${formatInteger(running.renderStats.skipped)} skipped${
                running.renderStats.failed > 0
                  ? `, ${formatInteger(running.renderStats.failed)} failed`
                  : ''
              }`
            : ''}
        </span>
      </div>
      {percent !== null ? (
        <div className="seeding-banner-track" aria-hidden="true">
          <div
            className="seeding-banner-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
