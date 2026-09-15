import { HTMLTable } from '@blueprintjs/core';
import { formatDecimal, formatInteger } from 'react-cheminfo/core';
import { Structure } from 'react-cheminfo/structure';
import { MF } from 'react-mf';

import type {
  LigandSearchMode,
  LigandSort,
  LigandSummary,
} from '../../shared/api/types.ts';

import LigandSortableHeader from './LigandSortableHeader.tsx';

interface LigandResultsTableProps {
  /** Matching ligand rows. */
  ligands: LigandSummary[];
  /** Code of the row currently selected (highlighted + drives the PDBs panel). */
  selectedCode: string | null;
  /** Called when the user clicks a row; pass `null` to clear the selection. */
  onSelect: (ligand: LigandSummary | null) => void;
  /** Active search mode — controls which extra columns are shown. */
  searchMode?: LigandSearchMode;
  /** Active column sort, or `null` for the default ranking. */
  sort: LigandSort | null;
  /** Called with the next sort state, or `null` to restore the default. */
  onSortChange: (sort: LigandSort | null) => void;
}

const SORTABLE_COLUMNS: Array<{
  column: 'code' | 'name' | 'mf' | 'mw' | 'nbPdbs';
  label: string;
  numeric?: boolean;
}> = [
  { column: 'code', label: 'Code' },
  { column: 'name', label: 'Name' },
  { column: 'mf', label: 'MF' },
  { column: 'mw', label: 'MW', numeric: true },
  { column: 'nbPdbs', label: '#PDBs', numeric: true },
];

/**
 * Tabular view of ligand search results. Each row shows the canonical 2D
 * structure (rendered from `idCode` with coordinates invented client-side),
 * the 3-letter code, name, formula, MW, and PDB count. A Similarity column
 * is added when `searchMode` is `'similarity'`.
 * @param props - Component props.
 * @param props.ligands - Matching ligand rows to display.
 * @param props.selectedCode - Currently-selected ligand code, or `null`.
 * @param props.onSelect - Selection-change handler.
 * @param props.searchMode - Active search mode.
 * @param props.sort - Active column sort, or `null`.
 * @param props.onSortChange - Sort-change handler.
 * @returns Results table React element.
 */
export default function LigandResultsTable({
  ligands,
  selectedCode,
  onSelect,
  searchMode,
  sort,
  onSortChange,
}: LigandResultsTableProps) {
  if (ligands.length === 0) {
    return <p className="placeholder">No matches.</p>;
  }
  const showSimilarity = searchMode === 'similarity';
  return (
    <div className="molecules-results-table-wrapper">
      <HTMLTable className="ligand-results-table" interactive compact>
        <thead>
          <tr>
            <th>Structure</th>
            {SORTABLE_COLUMNS.map(({ column, label, numeric }) => (
              <LigandSortableHeader
                key={column}
                column={column}
                label={label}
                numeric={numeric}
                sort={sort}
                onSortChange={onSortChange}
              />
            ))}
            {showSimilarity && <th className="num">Sim.</th>}
          </tr>
        </thead>
        <tbody>
          {ligands.map((ligand) => {
            const isActive = ligand.code === selectedCode;
            return (
              <tr
                key={ligand.code}
                className={isActive ? 'is-selected' : undefined}
                onClick={() => onSelect(isActive ? null : ligand)}
              >
                <td className="ligand-structure-cell">
                  <Structure
                    idCode={ligand.idCode}
                    width={120}
                    height={80}
                    autoCrop={false}
                  />
                </td>
                <td className="mono">{ligand.code}</td>
                <td className="ligand-name" title={ligand.name}>
                  {ligand.name}
                </td>
                <td className="mf-cell">
                  <MF mf={ligand.mf} />
                </td>
                <td className="num">{formatDecimal(ligand.mw, 2)}</td>
                <td className="num">{formatInteger(ligand.nbPdbs)}</td>
                {showSimilarity && (
                  <td className="num">
                    {ligand.similarity != null
                      ? `${formatDecimal(ligand.similarity * 100, 1)}%`
                      : '—'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </HTMLTable>
    </div>
  );
}
