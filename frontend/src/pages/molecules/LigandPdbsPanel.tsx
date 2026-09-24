import { formatInteger } from 'react-cheminfo/core';
import { ClickToCopy, CopyButton } from 'react-cheminfo/ui';
import { MF } from 'react-mf';
import { Link } from 'react-router';

import type {
  LigandPdbReference,
  LigandSummary,
} from '../../shared/api/types.ts';

interface LigandPdbsPanelProps {
  /** The active ligand selection, or `null` for the empty state. */
  ligand: LigandSummary | null;
  /** Total number of PDBs containing this ligand (independent of pagination). */
  total: number;
  /** Current page of PDBs (or `null` while loading). */
  pdbs: LigandPdbReference[] | null;
  /** Error message from the most recent fetch, if any. */
  error: string | null;
}

/**
 * Side panel that shows the PDBs containing the active ligand selection.
 * Each PDB id links into the existing browse page so the user can inspect
 * its 3D structure. Falls back to a placeholder when nothing is selected.
 * @param props - Component props.
 * @param props.ligand - The active ligand, or `null`.
 * @param props.total - Total PDB count for this ligand.
 * @param props.pdbs - Current page of PDB references (or `null` while loading).
 * @param props.error - Optional error message from the most recent fetch.
 * @returns PDB list React element.
 */
export default function LigandPdbsPanel({
  ligand,
  total,
  pdbs,
  error,
}: LigandPdbsPanelProps) {
  if (!ligand) {
    return (
      <p className="placeholder">
        Select a ligand to see the PDB entries that contain it.
      </p>
    );
  }
  if (error) {
    return <p className="error">{error}</p>;
  }
  if (pdbs === null) {
    return <p className="placeholder">Loading PDBs for {ligand.code}…</p>;
  }
  if (pdbs.length === 0) {
    return (
      <div>
        <LigandCaption ligand={ligand} />
        <p className="placeholder">
          No PDB entries reference {ligand.code} in this mirror yet. The link
          table is built incrementally as new entries are imported.
        </p>
      </div>
    );
  }
  return (
    <div>
      <LigandCaption ligand={ligand} />
      <div className="ligand-pdbs-summary">
        <span>
          Appears in {formatInteger(total)} PDB
          {total === 1 ? ' entry' : ' entries'}
          {pdbs.length < total
            ? ` (showing first ${pdbs.length.toString()})`
            : ''}
          .
        </span>
        <CopyButton
          small
          minimal
          label="Copy IDs"
          content={() => pdbs.map((pdb) => pdb.pdbId).join('\n')}
          title="Copy the listed PDB ids, one per line"
        />
      </div>
      <ul className="ligand-pdbs-list">
        {pdbs.map((pdb) => (
          <li key={pdb.pdbId}>
            <Link
              className="ligand-pdb-chip"
              to={`/browse?pdb=${pdb.pdbId}`}
              title={
                pdb.count > 1
                  ? `${pdb.pdbId} — ${pdb.count.toString()} copies of ${ligand.code}`
                  : `${pdb.pdbId} — 1 copy of ${ligand.code}`
              }
            >
              {pdb.pdbId}
              {pdb.count > 1 && (
                <span className="ligand-pdb-count">×{pdb.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface LigandCaptionProps {
  /** The active ligand selection. */
  ligand: LigandSummary;
}

/**
 * Identity of the selected ligand: its code, formula, mass and name, each one
 * a value a reader takes away with a click. It stays in view after the result
 * list has paged past the row the ligand was selected from.
 * @param props - Component props.
 * @param props.ligand - The active ligand selection.
 * @returns Caption React element.
 */
function LigandCaption({ ligand }: LigandCaptionProps) {
  return (
    <div className="ligand-pdbs-caption">
      <ClickToCopy
        className="ligand-pdbs-code"
        value={ligand.code}
        label="ligand code"
      >
        {ligand.code}
      </ClickToCopy>
      <ClickToCopy value={ligand.mf} label="molecular formula">
        <MF mf={ligand.mf} />
      </ClickToCopy>
      <ClickToCopy value={ligand.mw.toFixed(2)} label="molecular weight">
        {ligand.mw.toFixed(2)} g/mol
      </ClickToCopy>
      <ClickToCopy
        className="ligand-pdbs-name"
        value={ligand.name}
        label="ligand name"
        disabled={!ligand.name}
      >
        {ligand.name}
      </ClickToCopy>
    </div>
  );
}
