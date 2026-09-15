import { Card } from '@blueprintjs/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from 'react-cheminfo/ui';
import { useSearchParams } from 'react-router';

import type { OrderKey } from '../../shared/api/client.ts';
import {
  fetchByExperiment,
  fetchRangeStats,
  findDocuments,
} from '../../shared/api/client.ts';
import type { PdbDoc } from '../../shared/api/types.ts';
import { useAsync } from '../../shared/useAsync.ts';

import FilterPanel from './FilterPanel.tsx';
import PdbTable from './PdbTable.tsx';
import SelectedEntry from './SelectedEntry.tsx';
import type { FilterState } from './filters.ts';
import {
  filterStateFromUrl,
  filterStateToUrl,
  filtersToFindParams,
  makeRandomSeed,
} from './filters.ts';

/**
 * Page mounted at `/browse`. Drives every list update from a single
 * server-side query: filter sidebar + free-text query → `findDocuments`
 * (`GET /v1/pdbs?...`). Stats and method counts come from grouped SQL
 * queries on the same backend, so the page never has to load the whole
 * database into memory.
 * @returns Browse page React element.
 */
export default function BrowsePage() {
  const stats = useAsync(fetchRangeStats);
  const methodView = useAsync(fetchByExperiment);

  const [searchParams, setSearchParams] = useSearchParams();
  // Initial state is read from the URL once (lazy initializer). Subsequent
  // updates flow filters → URL, and we also re-hydrate when the URL changes
  // from outside (e.g. browser back/forward).
  const initial = useMemo(
    () => filterStateFromUrl(searchParams),
    // Only on mount — onwards we sync the other direction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [query, setQuery] = useState(initial.query);
  const [smart, setSmart] = useState(initial.smart);
  const [filters, setFilters] = useState<FilterState>(initial.filters);
  const [order, setOrder] = useState<OrderKey>(initial.order);
  const [seed, setSeed] = useState<number>(initial.seed);
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);

  // Selecting `random` from the empty default mints a fresh seed so the URL
  // captures a specific shuffle; everything else clears the seed back to 0.
  const handleOrderChange = useCallback((next: OrderKey) => {
    setOrder(next);
    setSeed(next === 'random' ? makeRandomSeed() : 0);
  }, []);

  const shuffleSeed = useCallback(() => {
    setOrder('random');
    setSeed(makeRandomSeed());
  }, []);

  // Push state changes into the URL so deep-links from the stats page work and
  // the back button restores the previous filter combination.
  useEffect(() => {
    const next = filterStateToUrl(filters, query, smart, order, seed);
    const current = searchParams.toString();
    if (next.toString() !== current) {
      setSearchParams(next, { replace: true });
    }
  }, [filters, query, smart, order, seed, searchParams, setSearchParams]);

  // Debounce the inputs so the keyword box doesn't fire one search query per
  // keystroke and slider drags are smooth. Order/seed are not user-typed so
  // they bypass the debounce — the list updates immediately on selection.
  const debouncedQuery = useDebouncedValue(query, 250);
  const debouncedSmart = useDebouncedValue(smart, 250);
  const debouncedFilters = useDebouncedValue(filters, 250);

  const findParams = useMemo(
    () =>
      filtersToFindParams(
        debouncedFilters,
        debouncedQuery,
        debouncedSmart,
        order,
        seed,
      ),
    [debouncedFilters, debouncedQuery, debouncedSmart, order, seed],
  );

  const findTask = useCallback(
    () => findDocuments<PdbDoc>(findParams),
    [findParams],
  );
  const findResult = useAsync(findTask);

  const docs = findResult.status === 'success' ? findResult.data.docs : [];
  const totalCount = useMemo(
    () =>
      methodView.status === 'success'
        ? methodView.data.rows.reduce((sum, row) => sum + row.value, 0)
        : 0,
    [methodView],
  );

  const methodCounts = useMemo<Array<[string, number]>>(
    () =>
      methodView.status === 'success'
        ? methodView.data.rows
            .map((row) => [row.key, row.value] as [string, number])
            .toSorted(([, a], [, b]) => b - a)
        : [],
    [methodView],
  );

  // Resolve the active selection during render so we never need a `useEffect`
  // to keep `pickedId` in sync with the filtered list.
  const selectedDoc = docs.find((doc) => doc._id === pickedId) ?? docs[0];
  const selectedId = selectedDoc?._id;

  return (
    <div className="browse-container">
      <div className="browse-grid">
        <FilterPanel
          query={query}
          onQueryChange={setQuery}
          smart={smart}
          onSmartChange={setSmart}
          matchCount={docs.length}
          totalCount={totalCount}
          methodCounts={methodCounts}
          stats={stats.status === 'success' ? stats.data : undefined}
          filters={filters}
          onChange={setFilters}
          order={order}
          onOrderChange={handleOrderChange}
          onShuffle={shuffleSeed}
        />
        <div className="browse-list-col">
          <Card className="browse-list panel">
            {findResult.status === 'loading' && (
              <p className="placeholder pdb-table-empty">Searching…</p>
            )}
            {findResult.status === 'error' && (
              <p className="placeholder pdb-table-empty">
                Search failed: {findResult.error.message}
              </p>
            )}
            {findResult.status === 'success' && (
              <PdbTable
                rows={docs}
                selectedId={selectedId}
                onSelect={setPickedId}
              />
            )}
          </Card>
        </div>
        {selectedDoc ? (
          <SelectedEntry doc={selectedDoc} />
        ) : (
          <>
            <div className="browse-main">
              <Card className="panel browse-entry-header">
                <p className="placeholder">
                  {findResult.status === 'success'
                    ? 'No entries match the current filter.'
                    : 'Loading…'}
                </p>
              </Card>
            </div>
            <Card className="panel browse-side" />
          </>
        )}
      </div>
    </div>
  );
}
