import { Button, Card, ProgressBar, Spinner } from '@blueprintjs/core';
import { useCallback, useEffect, useState } from 'react';
import { formatInteger } from 'react-cheminfo/core';

import {
  fetchDiagnostics,
  fetchRebuildTitlesStatus,
  fetchRenderThumbnailsStatus,
  triggerRebuildTitles,
  triggerRenderThumbnails,
} from '../../shared/api/client.ts';
import type {
  DiagnosticsResponse,
  RebuildTitlesState,
  RenderThumbnailsState,
} from '../../shared/api/types.ts';

import { useJobPoller } from './useJobPoller.ts';

/** Poll the render job status every 2 s while it is running. */
const RENDER_POLL_INTERVAL_MS = 2_000;
/** Poll the rebuild-titles job status every 2 s while it is running. */
const TITLES_POLL_INTERVAL_MS = 2_000;

type DiagStatus = 'idle' | 'loading' | 'done' | 'error';

/**
 * Settings card that shows a database-health snapshot (including full
 * assembly thumbnail coverage) and lets the operator render missing PNGs.
 *
 * Workflow:
 * 1. Click "Run diagnostics" → fetches `GET /v1/diagnostics`, which includes
 *    a full scan of all assembly entries for missing 200×200 thumbnails.
 * 2. If any are missing, "Render missing thumbnails" appears.
 * 3. Clicking it fires `POST /v1/fix/render-thumbnails` and polls
 *    `GET /v1/fix/render-thumbnails/status` every 2 s until done.
 * 4. On mount, both status endpoints are probed so an already-running job
 *    (started before this page was opened) is shown immediately.
 * @returns DiagnosticsCard React element.
 */
export default function DiagnosticsCard() {
  const [diagStatus, setDiagStatus] = useState<DiagStatus>('idle');
  const [diag, setDiag] = useState<DiagnosticsResponse | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  const [renderLoading, setRenderLoading] = useState(false);
  const [nmrRenderLoading, setNMRRenderLoading] = useState(false);
  const [forceRenderLoading, setForceRenderLoading] = useState(false);
  const [jobLabel, setJobLabel] = useState('');
  const [titlesLoading, setTitlesLoading] = useState(false);

  const { state: renderState, startPolling } =
    useJobPoller<RenderThumbnailsState>(
      fetchRenderThumbnailsStatus,
      RENDER_POLL_INTERVAL_MS,
    );
  const { state: titlesState, startPolling: startTitlesPolling } =
    useJobPoller<RebuildTitlesState>(
      fetchRebuildTitlesStatus,
      TITLES_POLL_INTERVAL_MS,
    );

  // On mount, probe both job statuses so an already-running job is shown
  // without the user having to click a trigger button first.
  useEffect(() => {
    startPolling();
    startTitlesPolling();
  }, [startPolling, startTitlesPolling]);

  const handleRunDiagnostics = useCallback(() => {
    setDiagStatus('loading');
    setDiagError(null);
    fetchDiagnostics().then(
      (result) => {
        setDiag(result);
        setDiagStatus('done');
      },
      (error: unknown) => {
        setDiagError(error instanceof Error ? error.message : String(error));
        setDiagStatus('error');
      },
    );
  }, []);

  const handleRebuildTitles = useCallback(() => {
    setTitlesLoading(true);
    triggerRebuildTitles().then(
      () => {
        setTitlesLoading(false);
        startTitlesPolling();
      },
      (error: unknown) => {
        setTitlesLoading(false);
        setDiagError(error instanceof Error ? error.message : String(error));
      },
    );
  }, [startTitlesPolling]);

  const handleRenderThumbnails = useCallback(
    (options: { force?: boolean; nmrOnly?: boolean }) => {
      if (options.nmrOnly) {
        setNMRRenderLoading(true);
        setJobLabel('Re-rendering NMR thumbnails…');
      } else if (options.force) {
        setForceRenderLoading(true);
        setJobLabel('Re-rendering all thumbnails…');
      } else {
        setRenderLoading(true);
        setJobLabel('Rendering missing thumbnails…');
      }
      triggerRenderThumbnails(options).then(
        () => {
          setRenderLoading(false);
          setNMRRenderLoading(false);
          setForceRenderLoading(false);
          startPolling();
        },
        (error: unknown) => {
          setRenderLoading(false);
          setNMRRenderLoading(false);
          setForceRenderLoading(false);
          setDiagError(error instanceof Error ? error.message : String(error));
        },
      );
    },
    [startPolling],
  );

  const { database } = diag ?? {};
  const {
    emptyTitleCount = 0,
    pdbCount = 0,
    ftsTitleCount = 0,
    assemblyTotal = 0,
    assemblyMissing = 0,
  } = database ?? {};

  const renderProgress =
    renderState && renderState.total > 0
      ? renderState.processed / renderState.total
      : 0;

  const hasMissing = assemblyTotal > 0 && assemblyMissing > 0;

  // Show the render section when diag is done (normal path) OR when a job is
  // actively running — so a job started before this page was opened is visible.
  const showRenderSection =
    (diagStatus === 'done' && assemblyTotal > 0) || renderState?.running;

  return (
    <Card className="panel">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>Database health</h3>
        <Button
          text="Run diagnostics"
          icon="diagnosis"
          loading={diagStatus === 'loading'}
          onClick={handleRunDiagnostics}
        />
      </div>

      {diagStatus === 'error' && diagError ? (
        <p className="placeholder">Error: {diagError}</p>
      ) : null}

      {diagStatus === 'done' && diag ? (
        <dl className="settings-sync-meta">
          <dt>PDB entries</dt>
          <dd>{formatInteger(pdbCount)}</dd>

          <dt>Empty titles</dt>
          <dd>
            {emptyTitleCount === 0 ? (
              <span className="settings-ok">
                0 — all entries have a title ✓
              </span>
            ) : (
              <span>
                {formatInteger(emptyTitleCount)} (
                {((emptyTitleCount / pdbCount) * 100).toFixed(2)}%) — PDB files
                without a TITLE record
              </span>
            )}
          </dd>
          {emptyTitleCount > 0 ? (
            <>
              <dt />
              <dd style={{ paddingTop: 4 }}>
                {titlesState ? (
                  titlesState.running ? (
                    <>
                      <p
                        style={{ margin: '0 0 6px' }}
                        className="settings-muted"
                      >
                        Rebuilding titles…{' '}
                        {formatInteger(titlesState.processed)} /{' '}
                        {formatInteger(titlesState.total)}
                      </p>
                      <ProgressBar
                        value={
                          titlesState.total > 0
                            ? titlesState.processed / titlesState.total
                            : 0
                        }
                        intent="primary"
                      />
                      <p
                        style={{ margin: '6px 0 0' }}
                        className="settings-muted"
                      >
                        Fixed: {formatInteger(titlesState.fixed)} · Skipped:{' '}
                        {formatInteger(titlesState.skipped)}
                      </p>
                    </>
                  ) : (
                    <p style={{ margin: 0 }}>
                      Done — fixed {formatInteger(titlesState.fixed)} title
                      {titlesState.fixed !== 1 ? 's' : ''}
                      {titlesState.skipped > 0
                        ? `, ${formatInteger(titlesState.skipped)} could not be recovered`
                        : ''}
                      .
                    </p>
                  )
                ) : (
                  <Button
                    intent="warning"
                    icon="tag"
                    text="Fix empty titles"
                    loading={titlesLoading}
                    onClick={handleRebuildTitles}
                  />
                )}
              </dd>
            </>
          ) : null}

          <dt>FTS-indexed</dt>
          <dd>
            {formatInteger(ftsTitleCount)}{' '}
            <span className="settings-muted">
              ({formatInteger(pdbCount - emptyTitleCount)} expected)
            </span>
          </dd>

          <dt>Assembly thumbnails</dt>
          <dd>
            {assemblyTotal === 0 ? (
              <span className="settings-muted">no assembly entries found</span>
            ) : (
              <span>
                {formatInteger(assemblyTotal - assemblyMissing)} /{' '}
                {formatInteger(assemblyTotal)} have a PNG
                {assemblyMissing === 0 ? (
                  <span className="settings-ok"> ✓</span>
                ) : (
                  <span className="settings-muted">
                    {' '}
                    — {formatInteger(assemblyMissing)} missing
                  </span>
                )}
              </span>
            )}
          </dd>
        </dl>
      ) : null}

      {diagStatus === 'loading' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner size={16} />
          <span className="settings-muted">Loading…</span>
        </div>
      ) : null}

      {showRenderSection ? (
        <div style={{ marginTop: 16 }}>
          {renderState ? (
            <div>
              {renderState.running ? (
                <>
                  <p style={{ margin: '0 0 6px' }} className="settings-muted">
                    {jobLabel || 'Rendering thumbnails…'}{' '}
                    {formatInteger(renderState.processed)} /{' '}
                    {formatInteger(renderState.total)}
                  </p>
                  <ProgressBar value={renderProgress} intent="primary" />
                  <p style={{ margin: '6px 0 0' }} className="settings-muted">
                    Rendered: {formatInteger(renderState.rendered)} · Skipped:{' '}
                    {formatInteger(renderState.skipped)} · Failed:{' '}
                    {formatInteger(renderState.failed)}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0 }}>
                  Done — rendered {formatInteger(renderState.rendered)} new PNG
                  {renderState.rendered !== 1 ? 's' : ''}, skipped{' '}
                  {formatInteger(renderState.skipped)} existing
                  {renderState.failed > 0
                    ? `, ${formatInteger(renderState.failed)} failed`
                    : ''}
                  .
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                intent={hasMissing ? 'warning' : 'none'}
                icon="media"
                text="Render missing thumbnails"
                loading={renderLoading}
                disabled={nmrRenderLoading || forceRenderLoading}
                onClick={() => handleRenderThumbnails({})}
              />
              <Button
                intent="warning"
                icon="refresh"
                text="Re-render NMR structures"
                loading={nmrRenderLoading}
                disabled={renderLoading || forceRenderLoading}
                onClick={() => handleRenderThumbnails({ nmrOnly: true })}
              />
              <Button
                intent="danger"
                icon="reset"
                text="Re-render all thumbnails"
                loading={forceRenderLoading}
                disabled={renderLoading || nmrRenderLoading}
                onClick={() => handleRenderThumbnails({ force: true })}
              />
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
