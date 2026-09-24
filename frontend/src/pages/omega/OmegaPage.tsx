import { Card } from '@blueprintjs/core';
import { useMemo, useState } from 'react';
import { formatDecimal, formatInteger } from 'react-cheminfo/core';
import { ClickToCopy } from 'react-cheminfo/ui';

import DualRangeSlider from '../../shared/DualRangeSlider.tsx';
import {
  fetchOmegaByYear,
  fetchOmegaSummary,
  fetchPairFrequencyByYear,
} from '../../shared/api/client.ts';
import type {
  OmegaSummaryResponse,
  OmegaTuple,
  PairFrequencyByYearResponse,
  PairFrequencyResponse,
} from '../../shared/api/types.ts';
import Panel from '../../shared/charts/Panel.tsx';
import { useAsync } from '../../shared/useAsync.ts';

import CisHeatmap from './CisHeatmap.tsx';
import CisOverTimeChart from './CisOverTimeChart.tsx';

/**
 * Amide-bond geometry section embedded in the Stats page: explore ω torsion
 * statistics across the PDB — global counts, distribution over time, and a
 * 20×20 amino-acid heatmap of cis-bond probability filterable by year range.
 * @returns Omega-section React element.
 */
export default function OmegaPage() {
  const summaryState = useAsync(fetchOmegaSummary);
  const byYearState = useAsync(fetchOmegaByYear);
  const pairByYearState = useAsync(fetchPairFrequencyByYear);

  const yearBounds = useMemo<[number, number] | null>(() => {
    if (byYearState.status !== 'success') return null;
    const years = byYearState.data.rows
      .map((row) => row.key)
      .filter((y) => Number.isFinite(y) && y >= 1970);
    if (years.length === 0) return null;
    return [Math.min(...years), Math.max(...years)];
  }, [byYearState]);

  const [yearRange, setYearRange] = useState<{
    min: number | null;
    max: number | null;
  }>({ min: null, max: null });

  const effectiveRange = useMemo<[number, number] | null>(() => {
    if (!yearBounds) return null;
    return [yearRange.min ?? yearBounds[0], yearRange.max ?? yearBounds[1]];
  }, [yearBounds, yearRange]);

  const isFullRange =
    !!effectiveRange &&
    !!yearBounds &&
    effectiveRange[0] === yearBounds[0] &&
    effectiveRange[1] === yearBounds[1];

  return (
    <>
      <h2>Amide-bond geometry</h2>
      <p className="omega-intro">
        For every consecutive residue pair, the parser computes the ω dihedral
        (Cα-C-N-Cα). Bonds with |ω| ≤ 30° are flagged as <strong>cis</strong>;
        |ω| ≥ 150° as <strong>trans</strong>; the rest are{' '}
        <strong>twisted</strong>. Below: global counts, distribution over time,
        and a 20×20 heatmap of cis probability per residue pair.
      </p>

      <SummaryCards state={summaryState} />

      <div className="charts charts--single">
        <Panel
          title="Cis-bond percentage by deposition year"
          description="Bar height: nbCis / nbPeptideBonds within each year. Highlighted bars match the heatmap year range below."
          state={byYearState}
          errorPrefix="Could not load per-year ω stats"
        >
          {(data) => (
            <CisOverTimeChart
              data={data}
              highlightRange={
                isFullRange ? undefined : (effectiveRange ?? undefined)
              }
            />
          )}
        </Panel>
      </div>

      <h3 className="omega-subheading">Cis probability per amino-acid pair</h3>
      <p className="omega-intro">
        Each cell shows P(cis) for the peptide bond between residue i and
        residue i+1 (rows = i, columns = i+1). Cells with fewer than 3 observed
        bonds are greyed out. The slider restricts the year range — drag to see
        how the picture evolves over time.
      </p>
      <YearRangeControl
        bounds={yearBounds}
        value={yearRange}
        onChange={setYearRange}
        effectiveRange={effectiveRange}
      />
      {effectiveRange === null ? (
        <Card className="panel omega-heatmap-panel">
          <h3>Cis probability heatmap (20 × 20)</h3>
          <p className="placeholder">Loading heatmap…</p>
        </Card>
      ) : (
        <HeatmapPanel state={pairByYearState} range={effectiveRange} />
      )}
    </>
  );
}

interface SummaryCardsProps {
  state: ReturnType<typeof useAsync<OmegaSummaryResponse>>;
}

function SummaryCards({ state }: SummaryCardsProps) {
  if (state.status !== 'success') {
    return (
      <div className="stats-grid">
        <Card className="stat-card" compact>
          <span className="label">Loading ω stats…</span>
        </Card>
      </div>
    );
  }
  const tuple: OmegaTuple = state.data.rows[0]?.value ?? [0, 0, 0, 0];
  const [nbCis, nbTrans, nbTwisted, nbBonds] = tuple;
  const cisPercent = nbBonds > 0 ? (nbCis / nbBonds) * 100 : 0;
  const twistedPercent = nbBonds > 0 ? (nbTwisted / nbBonds) * 100 : 0;
  return (
    <div className="stats-grid">
      <Card className="stat-card" compact>
        <span className="label">Peptide bonds</span>
        <span className="value">{formatInteger(nbBonds)}</span>
        <span className="sub">across the whole PDB</span>
      </Card>
      <Card className="stat-card" compact>
        <span className="label">Trans</span>
        <span className="value">{formatInteger(nbTrans)}</span>
        <span className="sub">|ω| ≥ 150°</span>
      </Card>
      <Card className="stat-card" compact>
        <span className="label">Cis</span>
        <span className="value">{formatInteger(nbCis)}</span>
        <ClickToCopy
          as="div"
          className="sub"
          value={formatDecimal(cisPercent, 3)}
          label="cis percentage"
        >
          {formatDecimal(cisPercent, 3)} % of bonds
        </ClickToCopy>
      </Card>
      <Card className="stat-card" compact>
        <span className="label">Twisted</span>
        <span className="value">{formatInteger(nbTwisted)}</span>
        <ClickToCopy
          as="div"
          className="sub"
          value={formatDecimal(twistedPercent, 3)}
          label="twisted percentage"
        >
          {formatDecimal(twistedPercent, 3)} % (30° &lt; |ω| &lt; 150°)
        </ClickToCopy>
      </Card>
    </div>
  );
}

interface YearRangeControlProps {
  bounds: [number, number] | null;
  value: { min: number | null; max: number | null };
  onChange: (next: { min: number | null; max: number | null }) => void;
  effectiveRange: [number, number] | null;
}

function YearRangeControl({
  bounds,
  value,
  onChange,
  effectiveRange,
}: YearRangeControlProps) {
  if (!bounds || !effectiveRange) {
    return <p className="placeholder">Loading year range…</p>;
  }
  return (
    <Card className="omega-year-control panel">
      <div className="omega-year-control-row">
        <span className="filter-group-label">Year range</span>
        <span className="filter-range-value">
          {effectiveRange[0]} – {effectiveRange[1]}
        </span>
      </div>
      <DualRangeSlider
        min={bounds[0]}
        max={bounds[1]}
        valueMin={value.min}
        valueMax={value.max}
        onChange={onChange}
      />
    </Card>
  );
}

interface HeatmapPanelProps {
  state: ReturnType<typeof useAsync<PairFrequencyByYearResponse>>;
  range: [number, number];
}

function HeatmapPanel({ state, range }: HeatmapPanelProps) {
  const reduced = useMemo<PairFrequencyResponse | null>(
    () =>
      state.status === 'success' ? reduceToRange(state.data, range) : null,
    [state, range],
  );
  return (
    <Panel
      title="Cis probability heatmap (20 × 20)"
      state={state}
      errorPrefix="Could not load heatmap"
    >
      {() => (reduced ? <CisHeatmap pairs={reduced} /> : null)}
    </Panel>
  );
}

/**
 * Sum the per-year pair counts into a single `[nbCis, nbTotal]` tuple per
 * `[residue1, residue2]` pair, keeping only rows whose year falls inside the
 * inclusive `[fromYear, toYear]` range. Runs on every slider change but stays
 * fast: ~24k rows × a Map lookup is well under one frame.
 * @param data - Full per-year pair-frequency payload.
 * @param range - Inclusive `[fromYear, toYear]` window.
 * @returns `PairFrequencyResponse`-shaped object ready for `CisHeatmap`.
 */
function reduceToRange(
  data: PairFrequencyByYearResponse,
  range: [number, number],
): PairFrequencyResponse {
  const [fromYear, toYear] = range;
  const accumulator = new Map<string, [number, number]>();
  for (const row of data.rows) {
    const [year, residue1, residue2] = row.key;
    if (year < fromYear || year > toYear) continue;
    const mapKey = `${residue1}:${residue2}`;
    const previous = accumulator.get(mapKey);
    if (previous) {
      previous[0] += row.value[0];
      previous[1] += row.value[1];
    } else {
      accumulator.set(mapKey, [row.value[0], row.value[1]]);
    }
  }
  const rows: PairFrequencyResponse['rows'] = [];
  for (const [mapKey, value] of accumulator) {
    const [residue1, residue2] = mapKey.split(':') as [string, string];
    rows.push({ key: [residue1, residue2], value });
  }
  return { rows };
}
