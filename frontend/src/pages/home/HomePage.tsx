import { useEffect, useState } from 'react';

import {
  fetchByExperiment,
  fetchDatabaseInfo,
  fetchLastAsymRsync,
  fetchLastBioAssemblyRsync,
  fetchSyncStatus,
} from '../../shared/api/client.ts';
import Panel from '../../shared/charts/Panel.tsx';
import { useAsync } from '../../shared/useAsync.ts';

import ExperimentChart from './ExperimentChart.tsx';
import HomeMethodsByYearChart from './HomeMethodsByYearChart.tsx';
import LastEntryPanel from './LastEntryPanel.tsx';
import StatsOverview from './StatsOverview.tsx';

async function fetchOverview() {
  const [dbInfo, lastAsymRsync, lastBioAssemblyRsync] = await Promise.all([
    fetchDatabaseInfo(),
    fetchLastAsymRsync(),
    fetchLastBioAssemblyRsync(),
  ]);
  return { ...dbInfo, lastAsymRsync, lastBioAssemblyRsync };
}

/** Re-fetch the overview every 5 s while a sync is running. */
const POLL_INTERVAL_RUNNING_MS = 5_000;
/** Idle: still poll once a minute so a sync that starts later is noticed. */
const POLL_INTERVAL_IDLE_MS = 60_000;

/**
 * Top-level page rendered at `/`: project headline, statistics grid, and the
 * year + experimental-method charts.
 * @returns Home page React element.
 */
export default function HomePage() {
  // Bumping `refreshKey` makes the three `useAsync` calls below re-fire
  // without flashing back to "Loading…" — used to keep the home page in
  // step with the live `pdb_entries` count while the initial seed runs.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let wasRunning = false;

    const tick = () => {
      if (cancelled) return;
      fetchSyncStatus().then(
        (status) => {
          if (cancelled) return;
          const isRunning = Boolean(status.rsync.running || status.ccd.running);
          if (isRunning) {
            setRefreshKey((k) => k + 1);
            wasRunning = true;
          } else if (wasRunning) {
            // Final refetch right after a sync finishes so the page shows
            // the post-run totals instead of the throttled-final value.
            setRefreshKey((k) => k + 1);
            wasRunning = false;
          }
          timer = setTimeout(
            tick,
            isRunning ? POLL_INTERVAL_RUNNING_MS : POLL_INTERVAL_IDLE_MS,
          );
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

  const overview = useAsync(fetchOverview, refreshKey);
  const byExperiment = useAsync(fetchByExperiment, refreshKey);

  return (
    <div className="container">
      <header>
        <h1>A fast look at any Protein Data Bank entry</h1>
        <p>
          A self-hosted, fast read-only mirror of the worldwide Protein Data
          Bank. Every entry is parsed once into SQLite and rendered once with
          PyMol so structure thumbnails load instantly. Search by title, residue
          composition, molecular weight or isoelectric point, run ligand
          substructure queries, inspect any entry in the in-browser Mol* 3D
          viewer, and compose multi-structure scenes with a JSmol-style
          scripting language.
        </p>
      </header>

      <h2>Statistics</h2>
      {overview.status === 'loading' ? (
        <p className="placeholder">Loading…</p>
      ) : overview.status === 'error' ? (
        <p className="placeholder">
          Could not load database stats: {overview.error.message}
        </p>
      ) : (
        <StatsOverview
          pdb={overview.data.pdb}
          assembly={overview.data.assembly}
          thisYear={overview.data.thisYear ?? 0}
          lastAsymRsync={overview.data.lastAsymRsync}
          lastBioAssemblyRsync={overview.data.lastBioAssemblyRsync}
        />
      )}

      {overview.status === 'success' &&
        overview.data.lastAsymRsync?.lastEntryId && (
          <>
            <h2>Last imported entry</h2>
            <LastEntryPanel pdbId={overview.data.lastAsymRsync.lastEntryId} />
          </>
        )}

      <div className="charts">
        <HomeMethodsByYearChart />
        <Panel
          title="Experimental method"
          state={byExperiment}
          errorPrefix="Could not load experiment breakdown"
        >
          {(data) => <ExperimentChart data={data} />}
        </Panel>
      </div>
    </div>
  );
}
