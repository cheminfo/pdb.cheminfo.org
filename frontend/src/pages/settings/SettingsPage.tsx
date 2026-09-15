import { Button, Card, Spinner } from '@blueprintjs/core';
import { useCallback, useEffect, useState } from 'react';
import { formatBytes } from 'react-cheminfo/core';

import {
  fetchCcdHistory,
  fetchRsyncHistory,
  fetchSyncStatus,
  triggerSync,
} from '../../shared/api/client.ts';
import type {
  CcdHistoryDoc,
  CcdSyncState,
  RsyncHistoryDoc,
  RsyncSyncState,
  SyncStatusResponse,
} from '../../shared/api/types.ts';
import { formatDateTime } from '../../shared/format.ts';

import CcdHistoryTable from './CcdHistoryTable.tsx';
import DiagnosticsCard from './DiagnosticsCard.tsx';
import HistoryTable from './HistoryTable.tsx';
import LoginForm from './LoginForm.tsx';
import SyncCard from './SyncCard.tsx';
import { useSettingsAuth } from './useSettingsAuth.ts';

/** While a sync is running, refresh status every two seconds. */
const POLL_INTERVAL_RUNNING_MS = 2_000;
/** When idle, still refresh once a minute so the "next run" estimate ticks. */
const POLL_INTERVAL_IDLE_MS = 60_000;

interface HistoryState {
  asym: RsyncHistoryDoc[];
  bioAssembly: RsyncHistoryDoc[];
  ccd: CcdHistoryDoc[];
}

/**
 * Settings page mounted at `/settings`. Surfaces the two background cron
 * loops (wwPDB rsync, CCD refresh), shows whether each is running, lets the
 * operator queue a manual sync, and lists the recent rsync history. The
 * sync work itself runs in a separate Docker container — this page only
 * drops a marker file in the shared `/app/data` volume.
 * @returns Settings page React element.
 */
export default function SettingsPage() {
  const { isAuthenticated, login, logout } = useSettingsAuth();

  if (isAuthenticated === null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return <SettingsDashboard onLogout={logout} />;
}

function SettingsDashboard({ onLogout }: { onLogout: () => Promise<void> }) {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState>({
    asym: [],
    bioAssembly: [],
    ccd: [],
  });
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<'rsync' | 'ccd' | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const refreshHistory = useCallback(() => {
    Promise.all([
      fetchRsyncHistory('asymUnit', 10),
      fetchRsyncHistory('bioAssembly', 10),
      fetchCcdHistory(10),
    ]).then(
      ([asym, bioAssembly, ccd]) => {
        setHistory({
          asym: asym.rows,
          bioAssembly: bioAssembly.rows,
          ccd: ccd.rows,
        });
        setHistoryError(null);
      },
      (error: unknown) => {
        setHistoryError(error instanceof Error ? error.message : String(error));
      },
    );
  }, []);

  // Adaptive polling: fast while a run is in flight, slow when idle. The
  // closure tracks the previous "running" state so we know to refresh the
  // history list right after a run finishes.

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let wasRunning = false;

    const tick = () => {
      fetchSyncStatus().then(
        (next) => {
          if (cancelled) return;
          setStatus(next);
          setStatusError(null);
          const isRunning = Boolean(next.rsync.running || next.ccd.running);
          if (wasRunning && !isRunning) refreshHistory();
          wasRunning = isRunning;
          const nextDelay = isRunning
            ? POLL_INTERVAL_RUNNING_MS
            : POLL_INTERVAL_IDLE_MS;
          timer = setTimeout(tick, nextDelay);
        },
        (error: unknown) => {
          if (cancelled) return;
          setStatusError(
            error instanceof Error ? error.message : String(error),
          );
          timer = setTimeout(tick, POLL_INTERVAL_IDLE_MS);
        },
      );
    };

    refreshHistory();
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refreshHistory]);

  const handleTrigger = useCallback((kind: 'rsync' | 'ccd') => {
    setPendingKind(kind);
    setActionMessage(null);
    triggerSync(kind).then(
      (response) => {
        if (response.status === 'queued') {
          setActionMessage(
            `Queued ${kind} sync. The cron container will pick it up within a few seconds.`,
          );
        } else if (response.status === 'already-queued') {
          setActionMessage(`A ${kind} sync is already queued.`);
        } else {
          setActionMessage(`A ${kind} sync is already in progress.`);
        }
        // Kick a status refresh to update the badge immediately. Best-effort.
        fetchSyncStatus().then(
          (next) => setStatus(next),
          () => {
            // The polling effect will recover on the next tick.
          },
        );
        setPendingKind(null);
      },
      (error: unknown) => {
        setActionMessage(
          error instanceof Error ? error.message : String(error),
        );
        setPendingKind(null);
      },
    );
  }, []);

  return (
    <div className="container settings-page">
      <header>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <h1 style={{ margin: 0 }}>Settings</h1>
          <Button
            variant="minimal"
            icon="log-out"
            text="Sign out"
            onClick={() => {
              void onLogout();
            }}
          />
        </div>
        <p>
          Background data refresh. The wwPDB rsync and Chemical Component
          Dictionary refreshes both run in their own Docker containers — this
          page lets you check their state and queue an immediate run without
          waiting for the next scheduled cycle.
        </p>
      </header>

      <h2>Background sync</h2>

      {statusError ? (
        <p className="placeholder">Could not load sync status: {statusError}</p>
      ) : null}

      {actionMessage ? (
        <p className="settings-action-message">{actionMessage}</p>
      ) : null}

      <div className="settings-sync-grid">
        <SyncCard
          state={status?.rsync ?? null}
          loading={status === null && !statusError}
          pending={pendingKind === 'rsync'}
          onTrigger={() => handleTrigger('rsync')}
          renderBody={(state) => <RsyncCardBody state={state} />}
        />
        <SyncCard
          state={status?.ccd ?? null}
          loading={status === null && !statusError}
          pending={pendingKind === 'ccd'}
          onTrigger={() => handleTrigger('ccd')}
          renderBody={(state) => <CcdCardBody state={state} />}
        />
      </div>

      <h2>Database health</h2>
      <DiagnosticsCard />

      <h2>Recent run history</h2>
      {historyError ? (
        <p className="placeholder">
          Could not load run history: {historyError}
        </p>
      ) : (
        <div className="settings-history-grid">
          <Card className="panel">
            <h3>Asymmetric units</h3>
            <HistoryTable rows={history.asym} />
          </Card>
          <Card className="panel">
            <h3>Biological assemblies</h3>
            <HistoryTable rows={history.bioAssembly} />
          </Card>
          <Card className="panel">
            <h3>Chemical Component Dictionary</h3>
            <CcdHistoryTable rows={history.ccd} />
          </Card>
        </div>
      )}
    </div>
  );
}

function RsyncCardBody({ state }: { state: RsyncSyncState }) {
  return (
    <dl className="settings-sync-meta">
      <dt>Last asym-unit run</dt>
      <dd>
        <RunSummary doc={state.lastAsymUnit} />
      </dd>
      <dt>Last bio-assembly run</dt>
      <dd>
        <RunSummary doc={state.lastBioAssembly} />
      </dd>
    </dl>
  );
}

function CcdCardBody({ state }: { state: CcdSyncState }) {
  const { lastRefresh, lastRefreshedAt, bytesOnDisk } = state;
  return (
    <dl className="settings-sync-meta">
      <dt>Cached archive</dt>
      <dd>
        {lastRefreshedAt
          ? `${formatDateTime(lastRefreshedAt)} · ${formatBytes(bytesOnDisk ?? undefined)}`
          : 'not seeded yet'}
      </dd>
      {lastRefresh ? (
        <>
          <dt>Last refresh</dt>
          <dd>
            <CcdRefreshSummary doc={lastRefresh} />
          </dd>
        </>
      ) : null}
    </dl>
  );
}

function CcdRefreshSummary({ doc }: { doc: CcdHistoryDoc }) {
  if (doc.status === 'failed') {
    return (
      <span className="settings-muted">
        failed after {Math.round(doc.durationMs / 1000)}s — {doc.error}
      </span>
    );
  }
  return (
    <span>
      {Math.round(doc.durationMs / 1000)}s · {doc.importedCount} imported
      {doc.skippedCount ? ` · ${doc.skippedCount} skipped` : ''}
    </span>
  );
}

function RunSummary({ doc }: { doc: RsyncHistoryDoc | null }) {
  if (!doc) return <span className="settings-muted">never</span>;
  return (
    <span>
      {formatDateTime(doc.finishedAt)} · {doc.updatedCount} new
      {doc.deletedCount ? ` · ${doc.deletedCount} deleted` : ''}
    </span>
  );
}
