import { Button, Card, Checkbox, HTMLSelect, Tag } from '@blueprintjs/core';
import { useMemo } from 'react';
import { NumberInput } from 'react-cheminfo/ui';

import DualRangeSlider from '../../shared/DualRangeSlider.tsx';
import SmartFilterBuilder from '../../shared/SmartFilterBuilder/index.ts';
import type { OrderKey, RangeStats } from '../../shared/api/client.ts';

import SearchBox from './SearchBox.tsx';
import type { FilterBounds, FilterState, RangeFilter } from './filters.ts';
import { ORDER_OPTIONS, buildPdbFields, emptyFilterState } from './filters.ts';

const HELIX_KIND_LABELS: Record<number, string> = {
  1: 'α right',
  2: 'ω right',
  3: 'π right',
  4: 'γ right',
  5: '3-10 right',
  6: 'α left',
  7: 'ω left',
  8: 'γ left',
  9: '2.7 ribbon',
  10: 'polyproline',
};

const SS_PRESENCE_LABELS: Record<string, string> = {
  mixed: 'Mixed (α+β)',
  'helices-only': 'Helices only',
  'sheets-only': 'Sheets only',
  none: 'No SS annotated',
};

const EC_CLASS_LABELS: Record<string, string> = {
  '1': 'Oxidoreductases',
  '2': 'Transferases',
  '3': 'Hydrolases',
  '4': 'Lyases',
  '5': 'Isomerases',
  '6': 'Ligases',
  '7': 'Translocases',
};

interface FilterPanelProps {
  /** Free-text title query (FTS5, controlled by the parent). */
  query: string;
  /** Called when the user types into the title search box. */
  onQueryChange: (value: string) => void;
  /** Current smart-sqlite3-filter expression (controlled by the parent). */
  smart: string;
  /** Called whenever the smart-filter builder changes the expression. */
  onSmartChange: (value: string) => void;
  /** Total number of results matching the current filter+query. */
  matchCount: number;
  /** Total number of documents in the database (for the "N / total" hint). */
  totalCount: number;
  /** Methods present in the database, with the doc count for each. */
  methodCounts: Array<[string, number]>;
  /** DB-wide stats used to size the slider tracks. */
  stats?: RangeStats;
  /** Current filter state. */
  filters: FilterState;
  /** Called whenever the user changes any filter control. */
  onChange: (filters: FilterState) => void;
  /** Currently-selected result ordering. */
  order: OrderKey;
  /** Called when the user picks a different order (incl. random). */
  onOrderChange: (order: OrderKey) => void;
  /** Roll a fresh random seed (only meaningful when `order === 'random'`). */
  onShuffle: () => void;
}

/**
 * Filter sidebar (leftmost browse column). Hosts the keyword search input,
 * a multi-select on experimental method, and dual-range sliders for the
 * numeric filters. The state lives in the parent so all controls drive a
 * single `/v1/pdbs` search query.
 * @param props - Component props.
 * @param props.query - Current free-text query.
 * @param props.onQueryChange - Called when the search input changes.
 * @param props.smart - Current smart-sqlite3-filter expression.
 * @param props.onSmartChange - Called when the chip builder changes the expression.
 * @param props.matchCount - Number of results currently matching.
 * @param props.totalCount - Total entries in the database.
 * @param props.methodCounts - DB-wide tally of `experiment` values.
 * @param props.stats - DB-wide numeric stats; defines slider bounds.
 * @param props.filters - Current filter state.
 * @param props.onChange - Called whenever a filter control changes.
 * @param props.order - Currently-selected result ordering key.
 * @param props.onOrderChange - Called when the user picks a different order.
 * @param props.onShuffle - Roll a fresh random seed for the `random` ordering.
 * @returns Filter panel React element.
 */
export default function FilterPanel({
  query,
  onQueryChange,
  smart,
  onSmartChange,
  matchCount,
  totalCount,
  methodCounts,
  stats,
  filters,
  onChange,
  order,
  onOrderChange,
  onShuffle,
}: FilterPanelProps) {
  const bounds = useMemo<FilterBounds>(() => {
    if (stats) {
      return {
        helices: { min: stats.helices.min, max: stats.helices.max },
        sheets: { min: stats.sheets.min, max: stats.sheets.max },
        ligands: { min: stats.ligands.min, max: stats.ligands.max },
        residues: { min: stats.residues.min, max: stats.residues.max },
        year: { min: stats.year.min, max: stats.year.max },
      };
    }
    return {
      helices: { min: 0, max: 0 },
      sheets: { min: 0, max: 0 },
      ligands: { min: 0, max: 0 },
      residues: { min: 0, max: 0 },
      year: { min: 1970, max: new Date().getFullYear() },
    };
  }, [stats]);

  function toggleMethod(method: string) {
    const next = new Set(filters.methods);
    if (next.has(method)) {
      next.delete(method);
    } else {
      next.add(method);
    }
    onChange({ ...filters, methods: next });
  }

  function setRange(
    key: keyof Omit<FilterState, 'methods'>,
    range: RangeFilter,
  ) {
    onChange({ ...filters, [key]: range });
  }

  const hasChartFilter =
    filters.helixKind !== null ||
    filters.ssPresence !== null ||
    filters.ecClass !== null ||
    filters.ligandCode !== null;

  const isActive =
    query.trim() !== '' ||
    smart.trim() !== '' ||
    filters.methods.size > 0 ||
    hasRange(filters.helices) ||
    hasRange(filters.sheets) ||
    hasRange(filters.ligands) ||
    hasRange(filters.residues) ||
    hasRange(filters.year) ||
    hasChartFilter;

  function reset() {
    onQueryChange('');
    onSmartChange('');
    onChange(emptyFilterState);
  }

  const smartFields = useMemo(
    () => buildPdbFields(methodCounts, bounds),
    [methodCounts, bounds],
  );

  return (
    <Card className="filter-panel panel">
      <div className="filter-panel-header">
        <h3>Filters</h3>
        <span className="filter-panel-count">
          {matchCount} / {totalCount}
        </span>
        {isActive && (
          <Button
            icon="cross"
            variant="minimal"
            size="small"
            onClick={reset}
            title="Clear all filters"
            aria-label="Clear all filters"
          />
        )}
      </div>

      <SearchBox value={query} onChange={onQueryChange} />

      <div className="filter-group">
        <div className="filter-group-label">Sort by</div>
        <div className="filter-order-row">
          <HTMLSelect
            fill
            value={order}
            onChange={(event) =>
              onOrderChange(event.currentTarget.value as OrderKey)
            }
            options={ORDER_OPTIONS.map((option) => ({
              value: option.key,
              label: option.label,
            }))}
          />
          {order === 'random' && (
            <Button
              icon="random"
              variant="minimal"
              onClick={onShuffle}
              title="Pick a new random shuffle"
              aria-label="Shuffle"
            />
          )}
        </div>
      </div>

      {hasChartFilter && (
        <div className="filter-group">
          <div className="filter-group-label">From stats charts</div>
          <div className="filter-chart-pills">
            {filters.helixKind !== null && (
              <Tag onRemove={() => onChange({ ...filters, helixKind: null })}>
                Helix kind:{' '}
                {HELIX_KIND_LABELS[filters.helixKind] ??
                  `kind ${filters.helixKind}`}
              </Tag>
            )}
            {filters.ssPresence !== null && (
              <Tag onRemove={() => onChange({ ...filters, ssPresence: null })}>
                Secondary structure:{' '}
                {SS_PRESENCE_LABELS[filters.ssPresence] ?? filters.ssPresence}
              </Tag>
            )}
            {filters.ecClass !== null && (
              <Tag onRemove={() => onChange({ ...filters, ecClass: null })}>
                EC class: {filters.ecClass}
                {EC_CLASS_LABELS[filters.ecClass]
                  ? ` — ${EC_CLASS_LABELS[filters.ecClass]}`
                  : ''}
              </Tag>
            )}
            {filters.ligandCode !== null && (
              <Tag onRemove={() => onChange({ ...filters, ligandCode: null })}>
                Ligand: {filters.ligandCode}
              </Tag>
            )}
          </div>
        </div>
      )}

      <div className="filter-group">
        <div className="filter-group-label">Field filters</div>
        <SmartFilterBuilder
          fields={smartFields}
          value={smart}
          onChange={onSmartChange}
        />
      </div>

      <div className="filter-group">
        <div className="filter-group-label">Method</div>
        {(() => {
          const visibleMethods = methodCounts.filter(
            ([method, count]) => count >= 100 || filters.methods.has(method),
          );
          if (visibleMethods.length === 0) {
            return <p className="placeholder">No method data.</p>;
          }
          return visibleMethods.map(([method, count]) => (
            <Checkbox
              key={method}
              className="filter-checkbox"
              checked={filters.methods.has(method)}
              onChange={() => toggleMethod(method)}
              labelElement={
                <>
                  <span className="filter-method-name" title={method}>
                    {prettyMethod(method)}
                  </span>
                  <span className="filter-method-count">{count}</span>
                </>
              }
            />
          ));
        })()}
      </div>

      <RangeRow
        label="Helices"
        range={filters.helices}
        bounds={bounds.helices}
        onChange={(range) => setRange('helices', range)}
      />
      <RangeRow
        label="Sheets"
        range={filters.sheets}
        bounds={bounds.sheets}
        onChange={(range) => setRange('sheets', range)}
      />
      <RangeRow
        label="Ligands"
        range={filters.ligands}
        bounds={bounds.ligands}
        onChange={(range) => setRange('ligands', range)}
      />
      <RangeRow
        label="Residues"
        range={filters.residues}
        bounds={bounds.residues}
        onChange={(range) => setRange('residues', range)}
      />
      <RangeRow
        label="Year"
        range={filters.year}
        bounds={bounds.year}
        onChange={(range) => setRange('year', range)}
      />
    </Card>
  );
}

interface RangeRowProps {
  label: string;
  range: RangeFilter;
  bounds: { min: number; max: number };
  onChange: (range: RangeFilter) => void;
}

/**
 * A range filter row: dual-thumb slider + numeric inputs for exact entry.
 * @param props - Component props.
 * @param props.label - Label shown above the controls.
 * @param props.range - Current selected range.
 * @param props.bounds - Data-derived [min, max] of the field.
 * @param props.onChange - Called when min or max changes.
 * @returns Range row element.
 */
function RangeRow({ label, range, bounds, onChange }: RangeRowProps) {
  const showSlider = bounds.max > bounds.min;
  const display = formatRange(range, bounds);
  return (
    <div className="filter-group">
      <div className="filter-group-row">
        <span className="filter-group-label">{label}</span>
        <span className="filter-range-value">{display}</span>
      </div>
      {showSlider && (
        <DualRangeSlider
          min={bounds.min}
          max={bounds.max}
          valueMin={range.min}
          valueMax={range.max}
          onChange={(next) => onChange(next)}
        />
      )}
      <div className="filter-range">
        <NumberInput
          allowEmpty
          buttons={false}
          fill
          placeholder={String(bounds.min)}
          value={range.min ?? undefined}
          ariaLabel={`${label}, from`}
          onChange={(next) => onChange({ ...range, min: next ?? null })}
        />
        <span className="filter-range-sep">–</span>
        <NumberInput
          allowEmpty
          buttons={false}
          fill
          placeholder={String(bounds.max)}
          value={range.max ?? undefined}
          ariaLabel={`${label}, to`}
          onChange={(next) => onChange({ ...range, max: next ?? null })}
        />
      </div>
    </div>
  );
}

function formatRange(
  range: RangeFilter,
  bounds: { min: number; max: number },
): string {
  const lo = range.min ?? bounds.min;
  const hi = range.max ?? bounds.max;
  return `${lo} – ${hi}`;
}

function hasRange(range: RangeFilter): boolean {
  return range.min !== null || range.max !== null;
}

function prettyMethod(method: string): string {
  return method
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      const first = word.charAt(0);
      return first ? first.toUpperCase() + word.slice(1) : word;
    })
    .join(' ');
}
