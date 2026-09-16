import { withBase } from '../../state/site.ts';

import type {
  CcdHistoryResponse,
  DatabaseInfo,
  DatabaseInfoResponse,
  DiagnosticsResponse,
  GroupedStatsResponse,
  LigandDetailResponse,
  LigandPdbsResponse,
  LigandSearchMode,
  LigandSearchResponse,
  LigandSort,
  OmegaByYearResponse,
  OmegaSummaryResponse,
  PairFrequencyByYearResponse,
  PairFrequencyResponse,
  PdbDoc,
  PdbViewResponse,
  RebuildTitlesStatusResponse,
  RebuildTitlesTriggerResponse,
  RenderThumbnailsStatusResponse,
  RenderThumbnailsTriggerResponse,
  RsyncHistoryDoc,
  RsyncHistoryResponse,
  StatsResponse,
  StatsValue,
  SyncStatusResponse,
  SyncTriggerResponse,
  ViewResponse,
} from './types.ts';

/**
 * Throw a descriptive `Error` when `response` carries a non-2xx status.
 * Pass-through otherwise. Used by every fetch wrapper in this module so the
 * error shape is consistent.
 * @param response - The `fetch()` response to assert on.
 */
function assertOk(response: Response): void {
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
}

/**
 * Fetch a JSON resource from the same origin and throw on a non-2xx response.
 * @param url - Relative URL to fetch.
 * @param signal - Optional `AbortSignal` to cancel the request in flight.
 * @returns Parsed JSON body of the response.
 */
async function fetchJson<TResponse>(
  url: string,
  signal?: AbortSignal,
): Promise<TResponse> {
  const response = await fetch(withBase(url), signal ? { signal } : undefined);
  assertOk(response);
  return response.json() as Promise<TResponse>;
}

/**
 * Fetch counts and disk size for both archives. Always issues a fresh
 * `/v1/database/info` request — the home page needs the *current* count
 * during the initial seed, not a stale promise memoised at module load.
 * @returns Promise resolving to the combined database info response.
 */
export function fetchDatabaseInfo(): Promise<DatabaseInfoResponse> {
  return fetchJson<DatabaseInfoResponse>('/v1/database/info');
}

/**
 * Fetch counts and disk size for the asymmetric-unit archive.
 * @returns Promise resolving to the database info subset.
 */
export async function fetchPdbInfo(): Promise<DatabaseInfo> {
  const info = await fetchDatabaseInfo();
  return info.pdb;
}

/**
 * Fetch counts and disk size for the bio-assembly archive.
 * @returns Promise resolving to the database info subset.
 */
export async function fetchAssemblyInfo(): Promise<DatabaseInfo> {
  const info = await fetchDatabaseInfo();
  return info.assembly;
}

/**
 * Fetch the grouped `byYear` reduce: number of entries deposited per year.
 * @returns Promise resolving to the rows of the view, keyed by year.
 */
export function fetchByYear(): Promise<ViewResponse<number>> {
  return fetchJson<ViewResponse<number>>('/v1/stats/byYear');
}

/**
 * Fetch the grouped `byExperiment` reduce: number of entries per experimental method.
 * @returns Promise resolving to the rows of the view, keyed by method name.
 */
export function fetchByExperiment(): Promise<ViewResponse<string>> {
  return fetchJson<ViewResponse<string>>('/v1/stats/byExperiment');
}

/**
 * Fetch the curated `jsmol` list: PDB entries pre-filtered for student work
 * (100–500 residues, ≥1 long helix, ≥1 long sheet, a small ligand). Returns
 * the full parsed document for each entry so the UI can filter and display
 * client-side.
 * @returns Promise resolving to the rows of the view with documents inlined.
 */
export function fetchJsmolList(): Promise<PdbViewResponse> {
  return fetchJson<PdbViewResponse>('/v1/pdbs/jsmol');
}

/**
 * Fetch the grouped `aminoAcidFreq` reduce: total residue count for each
 * of the 20 standard amino-acid 3-letter codes across the whole DB.
 * @returns Promise resolving to a row per amino-acid code.
 */
export function fetchAminoAcidFreq(): Promise<ViewResponse<string>> {
  return fetchJson<ViewResponse<string>>('/v1/stats/aminoAcidFreq');
}

/**
 * Fetch the grouped `nucleicBaseFreq` reduce: total residue count for
 * each DNA / RNA base across the whole DB.
 * @returns Promise resolving to a row per base code.
 */
export function fetchNucleicBaseFreq(): Promise<ViewResponse<string>> {
  return fetchJson<ViewResponse<string>>('/v1/stats/nucleicBaseFreq');
}

/**
 * Fetch the grouped `moleculeType` reduce: number of entries per
 * molecule-type bucket (`protein`, `nucleic`, `hybrid`, `other`).
 * @returns Promise resolving to a row per molecule type.
 */
export function fetchMoleculeType(): Promise<ViewResponse<string>> {
  return fetchJson<ViewResponse<string>>('/v1/stats/moleculeType');
}

/**
 * Fetch the grouped `modifiedResiduesHist` reduce: number of entries having
 * exactly N modified residues, keyed by N.
 * @returns Promise resolving to a row per modified-residue count.
 */
export function fetchModifiedResiduesHist(): Promise<ViewResponse<number>> {
  return fetchJson<ViewResponse<number>>('/v1/stats/modifiedResiduesHist');
}

/**
 * Fetch the grouped `helixKindHist` reduce: number of helices per `kind` code.
 * @returns Promise resolving to a row per helix kind code.
 */
export function fetchHelixKindHist(): Promise<ViewResponse<number>> {
  return fetchJson<ViewResponse<number>>('/v1/stats/helixKindHist');
}

/**
 * Fetch the grouped `helixLengthHist` reduce: number of helices per length.
 * @returns Promise resolving to a row per helix length.
 */
export function fetchHelixLengthHist(): Promise<ViewResponse<number>> {
  return fetchJson<ViewResponse<number>>('/v1/stats/helixLengthHist');
}

/**
 * Fetch the grouped `sheetLengthHist` reduce: number of beta strands per length.
 * @returns Promise resolving to a row per sheet strand length.
 */
export function fetchSheetLengthHist(): Promise<ViewResponse<number>> {
  return fetchJson<ViewResponse<number>>('/v1/stats/sheetLengthHist');
}

/**
 * Fetch the grouped `helicesVsSheets` reduce: number of entries with each
 * `[nbHelices, nbSheets]` pair, used to render a 2-D heatmap.
 * @returns Promise resolving to a row per `[nbHelices, nbSheets]` pair.
 */
export function fetchHelicesVsSheets(): Promise<
  ViewResponse<[number, number]>
> {
  return fetchJson<ViewResponse<[number, number]>>('/v1/stats/helicesVsSheets');
}

/**
 * Fetch the grouped `secondaryStructurePresence` reduce: number of
 * entries in each presence bucket (`none`, `helices-only`, `sheets-only`,
 * `mixed`).
 * @returns Promise resolving to a row per presence bucket.
 */
export function fetchSecondaryStructurePresence(): Promise<
  ViewResponse<string>
> {
  return fetchJson<ViewResponse<string>>(
    '/v1/stats/secondaryStructurePresence',
  );
}

/**
 * Fetch the grouped `residuesHistogram` reduce: number of entries whose
 * total residue count falls into each pre-defined bucket (lower bound).
 * @returns Promise resolving to a row per residues-count bucket.
 */
export function fetchResiduesHistogram(): Promise<ViewResponse<number>> {
  return fetchJson<ViewResponse<number>>('/v1/stats/residuesHistogram');
}

/**
 * Fetch the grouped `chainsHistogram` reduce: number of entries with
 * exactly N chains, keyed by N.
 * @returns Promise resolving to a row per chains count.
 */
export function fetchChainsHistogram(): Promise<ViewResponse<number>> {
  return fetchJson<ViewResponse<number>>('/v1/stats/chainsHistogram');
}

/**
 * Fetch the (un-grouped) `residuesPerChainStats` reduce: min / max / mean
 * residues-per-chain across all entries.
 * @returns Promise resolving to the `_stats` value.
 */
export function fetchResiduesPerChainStats(): Promise<StatsResponse> {
  return fetchJson<StatsResponse>('/v1/stats/residuesPerChainStats');
}

/**
 * Fetch the grouped `ligandFrequency` reduce: total occurrence count of
 * each non-water ligand (HET code) across the whole DB.
 * @returns Promise resolving to a row per ligand label.
 */
export function fetchLigandFrequency(): Promise<ViewResponse<string>> {
  return fetchJson<ViewResponse<string>>('/v1/stats/ligandFrequency');
}

/**
 * Fetch the grouped `ligandMwHistogram` reduce: number of ligand
 * occurrences per molecular-weight bucket (lower bound, in g/mol).
 * @returns Promise resolving to a row per MW bucket.
 */
export function fetchLigandMwHistogram(): Promise<ViewResponse<number>> {
  return fetchJson<ViewResponse<number>>('/v1/stats/ligandMwHistogram');
}

/**
 * Fetch the grouped `ligandsByYear` reduce: per-year `_stats` of the
 * number of (non-water) ligands per entry.
 * @returns Promise resolving to a row per year.
 */
export function fetchLigandsByYear(): Promise<GroupedStatsResponse<number>> {
  return fetchJson<GroupedStatsResponse<number>>('/v1/stats/ligandsByYear');
}

/**
 * Fetch the grouped `iepHistogram` reduce: number of entries per
 * isoelectric-point bucket (0.5-wide bins, keyed by lower bound).
 * @returns Promise resolving to a row per IEP bucket.
 */
export function fetchIepHistogram(): Promise<ViewResponse<number>> {
  return fetchJson<ViewResponse<number>>('/v1/stats/iepHistogram');
}

/**
 * Fetch the grouped `ecClasses` reduce: number of entries having at
 * least one chain in each of the 7 top-level Enzyme-Commission classes
 * (1 oxidoreductases, 2 transferases, …, 7 translocases).
 * @returns Promise resolving to a row per EC top-level class.
 */
export function fetchEcClasses(): Promise<ViewResponse<string>> {
  return fetchJson<ViewResponse<string>>('/v1/stats/ecClasses');
}

/**
 * Fetch the grouped `residuesByYear` reduce: per-year `_stats` of the
 * total number of residues per entry.
 * @returns Promise resolving to a row per year.
 */
export function fetchResiduesByYear(): Promise<GroupedStatsResponse<number>> {
  return fetchJson<GroupedStatsResponse<number>>('/v1/stats/residuesByYear');
}

/**
 * Fetch the grouped `methodByYear` reduce: number of entries per
 * `[year, experiment]` pair, used to render a stacked-by-method timeline.
 * @returns Promise resolving to a row per `[year, experiment]` pair.
 */
export function fetchMethodByYear(): Promise<ViewResponse<[number, string]>> {
  return fetchJson<ViewResponse<[number, string]>>('/v1/stats/methodByYear');
}

/** DB-wide min/max/avg statistics for the numeric filter fields. */
export interface RangeStats {
  helices: StatsValue;
  sheets: StatsValue;
  ligands: StatsValue;
  residues: StatsValue;
  year: StatsValue;
}

/**
 * Fetch DB-wide min/max/count statistics for every numeric filter field.
 * @returns Promise resolving to one `StatsValue` per field.
 */
export async function fetchRangeStats(): Promise<RangeStats> {
  const [helices, sheets, ligands, residues, year] = await Promise.all([
    fetchJson<StatsResponse>('/v1/stats/helicesStats'),
    fetchJson<StatsResponse>('/v1/stats/sheetsStats'),
    fetchJson<StatsResponse>('/v1/stats/ligandsStats'),
    fetchJson<StatsResponse>('/v1/stats/residuesStats'),
    fetchJson<StatsResponse>('/v1/stats/yearStats'),
  ]);
  return {
    helices: helices.rows[0]?.value ?? emptyStats(),
    sheets: sheets.rows[0]?.value ?? emptyStats(),
    ligands: ligands.rows[0]?.value ?? emptyStats(),
    residues: residues.rows[0]?.value ?? emptyStats(),
    year: year.rows[0]?.value ?? emptyStats(),
  };
}

function emptyStats(): StatsValue {
  return { sum: 0, count: 0, min: 0, max: 0, sumsqr: 0 };
}

/**
 * Fetch the raw PDB-format text for a given entry.
 * @param pdbId - 4-character PDB identifier (e.g. `4YYR`).
 * @returns Promise resolving to the PDB file as a string.
 */
export async function fetchPdbText(pdbId: string): Promise<string> {
  const response = await fetch(
    withBase(`/v1/pdbs/${encodeURIComponent(pdbId)}/raw`),
  );
  assertOk(response);
  return response.text();
}

/**
 * Fetch the parsed metadata document for a given PDB entry.
 * @param pdbId - 4-character PDB identifier (e.g. `4YYR`).
 * @returns Promise resolving to the parsed PDB document.
 */
export function fetchPdbDoc(pdbId: string): Promise<PdbDoc> {
  return fetchJson<PdbDoc>(`/v1/pdbs/${encodeURIComponent(pdbId)}`);
}

/**
 * Fetch the most recent rsync-history record for the asymmetric-unit archive
 * that has a non-null {@link RsyncHistoryDoc.lastEntryId}.
 * @returns Promise resolving to the most recent run with an entry, or `null` if none exists.
 */
export async function fetchLastAsymRsync(): Promise<RsyncHistoryDoc | null> {
  const response = await fetchJson<RsyncHistoryResponse>(
    '/v1/rsync-history?type=asymUnit&limit=1&hasEntry=true',
  );
  return response.rows[0] ?? null;
}

/**
 * Fetch the most recent rsync-history record for the bio-assembly archive
 * that has a non-null {@link RsyncHistoryDoc.lastEntryId}.
 * @returns Promise resolving to the most recent run with an entry, or `null` if none exists.
 */
export async function fetchLastBioAssemblyRsync(): Promise<RsyncHistoryDoc | null> {
  const response = await fetchJson<RsyncHistoryResponse>(
    '/v1/rsync-history?type=bioAssembly&limit=1&hasEntry=true',
  );
  return response.rows[0] ?? null;
}

/**
 * Fetch a page of rsync-history rows for the given archive type.
 * @param type - Which archive's history to load.
 * @param limit - Maximum rows to return (1–200).
 * @returns The rsync-history page.
 */
export function fetchRsyncHistory(
  type: 'asymUnit' | 'bioAssembly',
  limit = 20,
): Promise<RsyncHistoryResponse> {
  return fetchJson<RsyncHistoryResponse>(
    `/v1/rsync-history?type=${type}&limit=${limit}`,
  );
}

/**
 * Fetch the most recent CCD-refresh rows.
 * @param limit - Maximum rows to return (1–200).
 * @returns The CCD-history page.
 */
export function fetchCcdHistory(limit = 20): Promise<CcdHistoryResponse> {
  return fetchJson<CcdHistoryResponse>(`/v1/ccd-history?limit=${limit}`);
}

/**
 * Fetch the live state of the rsync and CCD crons.
 * @returns Promise resolving to the combined sync status.
 */
export function fetchSyncStatus(): Promise<SyncStatusResponse> {
  return fetchJson<SyncStatusResponse>('/v1/sync/status');
}

/**
 * Queue a manual run for the given cron. The API drops a marker in the
 * shared `data/control/` volume; the cron container picks it up on its
 * next 5-second poll and runs immediately.
 * @param kind - Which cron to wake.
 * @returns Promise resolving to the post-trigger sync state.
 */
export async function triggerSync(
  kind: 'rsync' | 'ccd',
): Promise<SyncTriggerResponse> {
  const response = await fetch(withBase('/v1/sync/trigger'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind }),
  });
  assertOk(response);
  return response.json() as Promise<SyncTriggerResponse>;
}

/**
 * Fetch a database health snapshot from `GET /v1/diagnostics`.
 * @returns Promise resolving to the diagnostics payload.
 */
export function fetchDiagnostics(): Promise<DiagnosticsResponse> {
  return fetchJson<DiagnosticsResponse>('/v1/diagnostics');
}

/**
 * Start (or report the status of) the background thumbnail render job.
 * @param options
 * @param options.force - Re-render existing PNGs. Defaults to false.
 * @param options.nmrOnly - Restrict to NMR entries (implies force). Defaults to false.
 * @returns Promise resolving to the trigger response.
 */
export async function triggerRenderThumbnails(options?: {
  force?: boolean;
  nmrOnly?: boolean;
}): Promise<RenderThumbnailsTriggerResponse> {
  const params = new URLSearchParams();
  if (options?.nmrOnly) params.set('nmrOnly', 'true');
  else if (options?.force) params.set('force', 'true');
  const query = params.size > 0 ? `?${params.toString()}` : '';
  const response = await fetch(withBase(`/v1/fix/render-thumbnails${query}`), {
    method: 'POST',
  });
  assertOk(response);
  return response.json() as Promise<RenderThumbnailsTriggerResponse>;
}

/**
 * Poll the current state of the thumbnail render job.
 * @returns Promise resolving to `{ state }` — `state` is `null` until the
 *   first job has been triggered.
 */
export function fetchRenderThumbnailsStatus(): Promise<RenderThumbnailsStatusResponse> {
  return fetchJson<RenderThumbnailsStatusResponse>(
    '/v1/fix/render-thumbnails/status',
  );
}

/**
 * Start the background rebuild-titles job.
 * Re-parses all entries with an empty title and writes the recovered title back
 * to the database.
 * @returns Promise resolving to the trigger response.
 */
export async function triggerRebuildTitles(): Promise<RebuildTitlesTriggerResponse> {
  const response = await fetch(withBase('/v1/fix/rebuild-titles'), {
    method: 'POST',
  });
  assertOk(response);
  return response.json() as Promise<RebuildTitlesTriggerResponse>;
}

/**
 * Poll the current state of the rebuild-titles job.
 * @returns Promise resolving to `{ state }` — `state` is `null` until the
 *   first job has been triggered.
 */
export function fetchRebuildTitlesStatus(): Promise<RebuildTitlesStatusResponse> {
  return fetchJson<RebuildTitlesStatusResponse>(
    '/v1/fix/rebuild-titles/status',
  );
}

/* ------------------------------------------------------------------------ *
 * /v1/pdbs search
 * ------------------------------------------------------------------------ */

/** A simple optional [min, max] range used to build search queries. */
export interface NumericRange {
  min: number | null;
  max: number | null;
}

/** Filters accepted by `findDocuments`. */
export interface FindParams {
  /** Allowed `experiment` values (any of). Empty / undefined = no filter. */
  methods?: string[];
  helices?: NumericRange;
  sheets?: NumericRange;
  ligands?: NumericRange;
  residues?: NumericRange;
  year?: NumericRange;
  /** Keep only entries with at least one HELIX record of this `kind` code. */
  helixKind?: number;
  /**
   * Secondary-structure presence bucket — `mixed` requires both helices and
   * sheets, `helices-only` / `sheets-only` exclude the other, `none` keeps
   * entries with neither.
   */
  ssPresence?: 'mixed' | 'helices-only' | 'sheets-only' | 'none';
  /** Top-level Enzyme-Commission digit (1–7). Matches `ec LIKE 'D.%'`. */
  ecClass?: string;
  /** Keep only entries that reference this CCD ligand code (e.g. `HEM`). */
  ligandCode?: string;
  /**
   * Free-text query matched against the `title` FTS5 column. Whitespace
   * splits the query into AND-ed tokens.
   */
  query?: string;
  /**
   * smart-sqlite3-filter expression evaluated against the `pdb_entries`
   * table — supports field-scoped operators (e.g. `year:>=2024
   * nb_helices:>5 title:~kinase`). Composes with the structured filters
   * and `query` (FTS5) via AND-intersection.
   */
  smart?: string;
  /**
   * Result ordering key. Defaults to ascending `id` server-side when omitted.
   * `random` requires a `seed`; identical seeds always produce the same
   * shuffle so the URL is shareable.
   */
  order?: OrderKey;
  /** Integer seed used by the `random` ordering. Ignored otherwise. */
  seed?: number;
}

/**
 * Server-supported ordering keys. Each value maps 1:1 to a fixed `ORDER BY`
 * clause in the backend.
 */
export type OrderKey =
  | 'id'
  | 'id-desc'
  | 'year'
  | 'year-desc'
  | 'residues'
  | 'residues-desc'
  | 'helices-desc'
  | 'sheets-desc'
  | 'ligands-desc'
  | 'random';

/** Response of a `_find`-style query. */
export interface FindResponse<TDoc> {
  docs: TDoc[];
}

const PAGE_LIMIT = 1000;

function appendRange(
  params: URLSearchParams,
  field: string,
  range: NumericRange | undefined,
): void {
  if (!range) return;
  if (typeof range.min === 'number') {
    params.set(`${field}Min`, String(range.min));
  }
  if (typeof range.max === 'number') {
    params.set(`${field}Max`, String(range.max));
  }
}

/**
 * Run a search query against the parsed-PDB metadata. Returns up to
 * `PAGE_LIMIT` docs in id order.
 * @param params - Filter parameters.
 * @returns Promise resolving to the matching docs.
 */
export async function findDocuments<TDoc>(
  params: FindParams,
): Promise<FindResponse<TDoc>> {
  const queryParams = new URLSearchParams();
  queryParams.set('limit', String(PAGE_LIMIT));
  if (params.methods && params.methods.length > 0) {
    queryParams.set('methods', params.methods.join(','));
  }
  appendRange(queryParams, 'helices', params.helices);
  appendRange(queryParams, 'sheets', params.sheets);
  appendRange(queryParams, 'ligands', params.ligands);
  appendRange(queryParams, 'residues', params.residues);
  appendRange(queryParams, 'year', params.year);
  if (typeof params.helixKind === 'number') {
    queryParams.set('helixKind', String(params.helixKind));
  }
  if (params.ssPresence) queryParams.set('ssPresence', params.ssPresence);
  if (params.ecClass) queryParams.set('ecClass', params.ecClass);
  if (params.ligandCode) queryParams.set('ligandCode', params.ligandCode);
  if (params.query?.trim()) queryParams.set('q', params.query.trim());
  if (params.smart?.trim()) queryParams.set('smart', params.smart.trim());
  if (params.order && params.order !== 'id') {
    queryParams.set('order', params.order);
  }
  if (params.order === 'random' && typeof params.seed === 'number') {
    queryParams.set('seed', String(params.seed));
  }
  return fetchJson<FindResponse<TDoc>>(`/v1/pdbs?${queryParams.toString()}`);
}

/**
 * Fetch the global ω-bond totals across the whole database.
 * @returns Promise resolving to a single-row response whose value is the
 *   `[nbCis, nbTrans, nbTwisted, nbPeptideBonds]` tuple summed over every entry.
 */
export function fetchOmegaSummary(): Promise<OmegaSummaryResponse> {
  return fetchJson<OmegaSummaryResponse>('/v1/stats/omegaSummary');
}

/**
 * Fetch ω-bond totals broken down by deposition year.
 * @returns Promise resolving to one row per year.
 */
export function fetchOmegaByYear(): Promise<OmegaByYearResponse> {
  return fetchJson<OmegaByYearResponse>('/v1/stats/omegaByYear');
}

/**
 * Fetch the per-pair `[nbCis, nbTotal]` tuples for every observed
 * `[residue1, residue2]` peptide bond, optionally restricted to a year range.
 * @param yearRange - Optional `[minYear, maxYear]` inclusive bounds.
 * @returns Promise resolving to one row per pair.
 */
export function fetchPairFrequency(
  yearRange?: [number, number],
): Promise<PairFrequencyResponse> {
  if (!yearRange) {
    return fetchJson<PairFrequencyResponse>('/v1/stats/pairFrequency');
  }
  const [fromYear, toYear] = yearRange;
  return fetchJson<PairFrequencyResponse>(
    `/v1/stats/pairFrequency?fromYear=${fromYear}&toYear=${toYear}`,
  );
}

/**
 * Fetch per-`[year, residue1, residue2]` `[nbCis, nbTotal]` tuples for the
 * whole PDB. The page fetches this once and reduces it locally so the year-
 * range slider can re-render the heatmap without hitting the backend.
 * @returns Promise resolving to one row per (year, r1, r2) triple.
 */
export function fetchPairFrequencyByYear(): Promise<PairFrequencyByYearResponse> {
  return fetchJson<PairFrequencyByYearResponse>(
    '/v1/stats/pairFrequencyByYear',
  );
}

/** Parameters of {@link fetchLigandSearch}. */
export interface LigandSearchParams {
  /**
   * OpenChemLib idCode of the query molecule, or `null` for the default
   * ranking (most-used ligands by descending PDB count).
   * @default null
   */
  idCode?: string | null;
  /** @default 'substructure' */
  mode?: LigandSearchMode;
  /**
   * Tanimoto threshold for similarity mode, so the full ligand list comes
   * back ranked by similarity when left at `0`.
   * @default 0
   */
  minSimilarity?: number;
  /**
   * Attribute filter in `smart-sqlite3-filter` syntax (e.g.
   * `code:~AT name:~adenosine mw:100..500`), applied on top of the structure
   * query. The server compiles it to SQL and uses it to restrict the structure
   * search's candidates, so filtering also makes the search faster.
   * @default ''
   */
  smart?: string;
  /**
   * Explicit column sort. Omit for the default most-referenced ranking (or,
   * with a structure query, the searcher's own relevance ranking).
   * @default null
   */
  sort?: LigandSort | null;
  /**
   * Page size.
   * @default 50
   */
  limit?: number;
  /**
   * Number of matches to skip.
   * @default 0
   */
  offset?: number;
  /**
   * Cancels the request when the caller supersedes it — e.g. the structure
   * query changed before this one came back.
   */
  signal?: AbortSignal;
}

/**
 * Run a structure and/or attribute search against the canonical CCD ligand
 * database.
 * @param params - Search parameters.
 * @returns One page of matching ligands, the total match count and search statistics.
 */
export function fetchLigandSearch(
  params: LigandSearchParams = {},
): Promise<LigandSearchResponse> {
  const {
    idCode = null,
    mode = 'substructure',
    minSimilarity = 0,
    smart = '',
    sort = null,
    limit = 50,
    offset = 0,
    signal,
  } = params;
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (idCode) {
    query.set('substructure', idCode);
    query.set('mode', mode);
    if (mode === 'similarity') {
      query.set('minSimilarity', String(minSimilarity));
    }
  }
  if (smart) query.set('smart', smart);
  if (sort) {
    query.set('sort', sort.column);
    query.set('direction', sort.direction);
  }
  return fetchJson<LigandSearchResponse>(
    `/v1/ligands?${query.toString()}`,
    signal,
  );
}

/**
 * Fetch the canonical structure rows for a specific list of ligand codes.
 * @param codes - 3-letter chemical-component codes.
 * @returns Matching ligands (order is not guaranteed).
 */
export function fetchLigandsByCodes(
  codes: string[],
): Promise<LigandSearchResponse> {
  if (codes.length === 0) {
    return Promise.resolve({
      ligands: [],
      total: 0,
      limit: 0,
      offset: 0,
      stats: {
        screened: 0,
        verified: 0,
        screeningMs: 0,
        verificationMs: 0,
        overLimit: false,
      },
    });
  }
  const params = new URLSearchParams({ codes: codes.join(',') });
  return fetchJson<LigandSearchResponse>(`/v1/ligands?${params.toString()}`);
}

/**
 * Fetch the canonical record for a single ligand code.
 * @param code - 3-letter chemical-component code.
 * @returns Ligand detail wrapper.
 */
export function fetchLigandDetail(code: string): Promise<LigandDetailResponse> {
  return fetchJson<LigandDetailResponse>(
    `/v1/ligands/${encodeURIComponent(code)}`,
  );
}

/**
 * Fetch a paginated list of PDBs containing a given ligand code.
 * @param code - 3-letter chemical-component code.
 * @param limit - Page size (max 1000).
 * @param offset - Number of rows to skip.
 * @returns Paginated PDB references for the ligand.
 */
export function fetchLigandPdbs(
  code: string,
  limit = 100,
  offset = 0,
): Promise<LigandPdbsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return fetchJson<LigandPdbsResponse>(
    `/v1/ligands/${encodeURIComponent(code)}/pdbs?${params.toString()}`,
  );
}
