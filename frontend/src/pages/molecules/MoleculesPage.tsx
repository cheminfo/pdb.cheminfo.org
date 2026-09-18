import {
  Button,
  ButtonGroup,
  Card,
  ProgressBar,
  Spinner,
} from '@blueprintjs/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatInteger } from 'react-cheminfo/core';
import type { StructureEditorChange } from 'react-cheminfo/structure';
import { StructureEditor } from 'react-cheminfo/structure';

import { fetchLigandPdbs, fetchLigandSearch } from '../../shared/api/client.ts';
import type {
  LigandPdbReference,
  LigandSearchMode,
  LigandSearchResponse,
  LigandSort,
  LigandSummary,
} from '../../shared/api/types.ts';

import LigandFilterFields from './LigandFilterFields.tsx';
import LigandPagination from './LigandPagination.tsx';
import LigandPdbsPanel from './LigandPdbsPanel.tsx';
import LigandResultsTable from './LigandResultsTable.tsx';
import type { LigandFilterDraft } from './ligandFilters.ts';
import { EMPTY_FILTER_DRAFT, toSmartQuery } from './ligandFilters.ts';

const PAGE_SIZE = 50;

/** Delay before a filter keystroke reaches the API, in milliseconds. */
const FILTER_DEBOUNCE_MS = 300;

/**
 * Molecules page mounted at `/molecules`. Lets the user draw or paste a
 * substructure query, lists matching ligand codes ranked by PDB count, and
 * — once a ligand is selected — shows the PDBs that contain it. The panel
 * on the left always shows a ranking of the most-used ligands when no
 * query is active, so the page is useful as a browser even before any
 * drawing.
 * @returns Molecules-page React element.
 */
export default function MoleculesPage() {
  const [queryIdCode, setQueryIdCode] = useState<string | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [searchMode, setSearchMode] =
    useState<LigandSearchMode>('substructure');
  const [search, setSearch] = useState<LigandSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [filterDraft, setFilterDraft] =
    useState<LigandFilterDraft>(EMPTY_FILTER_DRAFT);
  const [debouncedDraft, setDebouncedDraft] =
    useState<LigandFilterDraft>(EMPTY_FILTER_DRAFT);
  const [sort, setSort] = useState<LigandSort | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [pdbs, setPdbs] = useState<LigandPdbReference[] | null>(null);
  const [pdbsTotal, setPdbsTotal] = useState(0);
  const [pdbsError, setPdbsError] = useState<string | null>(null);

  // Debounce the filter fields so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (filterDraft === debouncedDraft) return;
    const timeout = setTimeout(() => {
      setDebouncedDraft(filterDraft);
      setOffset(0);
      setSearching(true);
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [filterDraft, debouncedDraft]);

  // The filter fields become one smart-sqlite3-filter expression; the server
  // compiles it to SQL and uses it to restrict the structure search's
  // candidates, so a filtered search is also a faster one.
  const smart = useMemo(() => toSmartQuery(debouncedDraft), [debouncedDraft]);

  // Run the search whenever the query, mode, filters or page change. Each run
  // aborts the previous one, so a structure the user has already moved past
  // never holds up (or overwrites) the current result — a substructure scan can
  // take seconds, and without this the responses could land out of order. The
  // `searching` flag is raised at the user-action points below, not here, so an
  // effect never sets state synchronously.
  useEffect(() => {
    const controller = new AbortController();
    fetchLigandSearch({
      idCode: queryIdCode,
      mode: searchMode,
      smart,
      sort,
      limit: PAGE_SIZE,
      offset,
      signal: controller.signal,
    })
      .then((result) => {
        setSearch(result);
        setSearchError(null);
        setSearching(false);
      })
      .catch((error: unknown) => {
        // The cleanup below aborted this request because a newer one started;
        // the newer request owns the UI, so leave `searching` on for it.
        if (controller.signal.aborted) return;
        setSearchError(
          error instanceof Error ? error.message : 'Search failed',
        );
        setSearching(false);
      });
    return () => controller.abort();
  }, [queryIdCode, searchMode, smart, sort, offset]);

  // When the user types/draws a new query, mark the page as loading via an
  // event handler instead of an effect setter so React 19 stops complaining
  // about cascading renders.

  // Fetch PDBs for the active ligand selection.
  useEffect(() => {
    if (!selectedCode) return;
    let cancelled = false;
    fetchLigandPdbs(selectedCode, 100, 0)
      .then((response) => {
        if (cancelled) return;
        setPdbs(response.pdbs);
        setPdbsTotal(response.total);
        setPdbsError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPdbsError(
          error instanceof Error ? error.message : 'Failed to load PDBs',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  // Each handler raises `searching` as it changes what to search for, so the
  // indicator appears the instant the user acts rather than a frame later.
  const handleEditorChange = useCallback((change: StructureEditorChange) => {
    if (change.mode !== 'molecule') return;
    // An empty canvas must NOT become a query: an empty fragment is contained in
    // every molecule, so it would run a substructure scan over the whole CCD.
    // The empty-molecule idCode varies (`d@` for a plain molecule, `dH` for a
    // fragment, more with coordinates), so gate on the atom count, not the code.
    const hasAtoms = change.molecule.getAllAtoms() > 0;
    setQueryIdCode(hasAtoms ? change.idCode : null);
    setOffset(0);
    setSearching(true);
  }, []);

  // A new revision empties the canvas and drops an edit still waiting out the
  // editor's debounce, which would otherwise bring the query back.
  const handleClear = useCallback(() => {
    setQueryIdCode(null);
    setEditorRevision((revision) => revision + 1);
    setOffset(0);
    setSearching(true);
  }, []);

  const handleModeChange = useCallback(
    (mode: LigandSearchMode) => {
      if (mode === searchMode) return;
      setSearchMode(mode);
      setOffset(0);
      if (queryIdCode) setSearching(true);
    },
    [searchMode, queryIdCode],
  );

  const handleSortChange = useCallback((next: LigandSort | null) => {
    setSort(next);
    setOffset(0);
    setSearching(true);
  }, []);

  const handleOffsetChange = useCallback((next: number) => {
    setOffset(next);
    setSearching(true);
  }, []);

  const handleSelectLigand = useCallback((ligand: LigandSummary | null) => {
    setSelectedCode(ligand?.code ?? null);
    // Clear stale state up-front so the panel doesn't flash old PDBs.
    setPdbs(null);
    setPdbsTotal(0);
    setPdbsError(null);
  }, []);

  return (
    <div className="container molecules-page">
      <header>
        <h1>Molecules</h1>
        <p>
          Draw a substructure on the left to find every wwPDB ligand that
          contains it. Results are ranked by the number of PDB entries that
          reference each ligand. Selecting a ligand reveals the list of PDBs.
        </p>
      </header>

      <div className="molecules-layout">
        <Card className="panel molecules-editor-panel">
          <div className="molecules-editor-header">
            <h2>Query</h2>
            <Button
              icon="cross"
              variant="minimal"
              size="small"
              className="molecules-clear-button"
              onClick={handleClear}
              disabled={!queryIdCode}
              title="Clear query"
              aria-label="Clear query"
            />
          </div>
          <div className="molecules-mode-selector">
            <ButtonGroup>
              <Button
                active={searchMode === 'substructure'}
                onClick={() => handleModeChange('substructure')}
                size="small"
              >
                Substructure
              </Button>
              <Button
                active={searchMode === 'similarity'}
                onClick={() => handleModeChange('similarity')}
                size="small"
              >
                Similarity
              </Button>
              <Button
                active={searchMode === 'exact'}
                onClick={() => handleModeChange('exact')}
                size="small"
              >
                Exact
              </Button>
            </ButtonGroup>
          </div>
          <div className="molecules-editor-canvas">
            <StructureEditor
              revision={editorRevision}
              onChange={handleEditorChange}
            />
          </div>
          <div className="molecules-editor-actions">
            <span className="molecules-status">
              {searching
                ? 'Searching…'
                : search
                  ? formatStats(search, queryIdCode !== null, searchMode)
                  : ''}
            </span>
          </div>
          {searchError && <p className="error">{searchError}</p>}
          <LigandFilterFields draft={filterDraft} onChange={setFilterDraft} />
        </Card>

        <Card className="panel molecules-results-panel">
          <div className="molecules-results-header">
            <h2>
              {queryIdCode === null
                ? 'Most-referenced ligands'
                : searchMode === 'similarity'
                  ? 'Similar ligands'
                  : searchMode === 'exact'
                    ? 'Exact matches'
                    : 'Substructure matches'}
            </h2>
            {searching && (
              <span className="molecules-searching-badge">
                <Spinner size={14} />
                Searching the database…
              </span>
            )}
          </div>
          <div
            className="molecules-search-progress"
            aria-hidden={!searching}
            data-active={searching ? 'true' : undefined}
          >
            {searching && <ProgressBar intent="primary" />}
          </div>
          <div
            className={
              searching
                ? 'molecules-results-body is-searching'
                : 'molecules-results-body'
            }
          >
            <LigandResultsTable
              ligands={search?.ligands ?? []}
              selectedCode={selectedCode}
              onSelect={handleSelectLigand}
              searchMode={queryIdCode !== null ? searchMode : undefined}
              sort={sort}
              onSortChange={handleSortChange}
            />
          </div>
          <LigandPagination
            total={search?.total ?? 0}
            limit={PAGE_SIZE}
            offset={offset}
            pageSize={search?.ligands.length ?? 0}
            onOffsetChange={handleOffsetChange}
          />
        </Card>

        <Card className="panel molecules-pdbs-panel">
          <h2>PDBs</h2>
          <div className="molecules-pdbs-panel-body">
            <LigandPdbsPanel
              ligandCode={selectedCode}
              total={pdbsTotal}
              pdbs={pdbs}
              error={pdbsError}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Render the search-stats line shown next to the editor. The match count is
 * the total across every page — the pager under the table reports the
 * visible range.
 * @param result - Most recent successful search response.
 * @param hasQuery - Whether a structure query is active.
 * @param mode - Active search mode.
 * @returns Human-readable status string.
 */
function formatStats(
  result: LigandSearchResponse,
  hasQuery: boolean,
  mode: LigandSearchMode,
): string {
  const { total, stats } = result;
  if (!hasQuery) return '';
  const overflow = stats.overLimit ? '+' : '';
  const count = `${formatInteger(total)}${overflow} match${total !== 1 ? 'es' : ''}`;
  const ms = stats.screeningMs + stats.verificationMs;
  if (mode === 'similarity') {
    return `${count} · ranked by similarity in ${ms.toString()} ms`;
  }
  if (mode === 'substructure') {
    return `${count} · ${stats.screened.toString()} screened in ${ms.toString()} ms`;
  }
  return `${count} in ${ms.toString()} ms`;
}
