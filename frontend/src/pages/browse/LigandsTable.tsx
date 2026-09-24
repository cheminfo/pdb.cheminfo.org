import { HTMLTable } from '@blueprintjs/core';
import { useEffect, useState } from 'react';
import { Structure } from 'react-cheminfo/structure';
import { ClickToCopy } from 'react-cheminfo/ui';
import { MF } from 'react-mf';

import type { FocusSpec } from '../../shared/PdbViewer.tsx';
import { fetchLigandsByCodes } from '../../shared/api/client.ts';
import type { LigandSummary, PdbFormula } from '../../shared/api/types.ts';

import FocusButton from './FocusButton.tsx';

interface LigandsTableProps {
  /** Formula records of the active PDB document. */
  formula: PdbFormula[];
  /** Stable key of the row currently focused in the 3D viewer. */
  selectedKey?: string;
  /** Called when the user toggles a row's focus button. */
  onFocus: (key: string | null, spec: FocusSpec | null) => void;
}

/**
 * Side-panel table of ligands / non-water HETATM records for the active PDB
 * entry. Water (`HOH`) is shown last. Each row
 * carries a focus button that highlights the matching residues in the 3D
 * viewer.
 * @param props - Component props.
 * @param props.formula - Formula records (label, MF, name, count) parsed from the PDB.
 * @param props.selectedKey - Stable key of the row currently focused in the 3D viewer.
 * @param props.onFocus - Called when the user toggles a row's focus button.
 * @returns Compact ligand table.
 */
export default function LigandsTable({
  formula,
  selectedKey,
  onFocus,
}: LigandsTableProps) {
  const sorted = formula.toSorted((left, right) => {
    if (left.label === 'HOH') return 1;
    if (right.label === 'HOH') return -1;
    return left.label.localeCompare(right.label);
  });

  // Fetch the canonical CCD structure for each ligand label so we can
  // render a 2D thumbnail. Skips water (no value as a structure) and
  // gracefully degrades when the ligand API is unavailable: the column
  // simply stays empty.
  const codes = sorted
    .map((entry) => entry.label)
    .filter((label) => label && label !== 'HOH');
  const structures = useStructuresByCode(codes);

  return (
    <HTMLTable className="info-table" compact>
      <thead>
        <tr>
          <th className="focus-col" aria-label="Show in viewer" />
          <th aria-label="2D structure" />
          <th>Label</th>
          <th>MF</th>
          <th>Name</th>
          <th className="num">Number</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((entry, index) => {
          const key = `ligand:${entry.label}:${String(index)}`;
          const isActive = key === selectedKey;
          const structure = structures.get(entry.label);
          return (
            <tr key={key} className={isActive ? 'is-focused' : undefined}>
              <td className="focus-col">
                <FocusButton
                  isActive={isActive}
                  label={`Show ${entry.label} in viewer`}
                  onClick={() =>
                    isActive
                      ? onFocus(null, null)
                      : onFocus(key, { kind: 'ligand', label: entry.label })
                  }
                />
              </td>
              <ClickToCopy
                as="td"
                className="ligand-structure-cell"
                value={structure?.smiles ?? ''}
                label="SMILES"
                disabled={!structure}
              >
                {structure ? (
                  <Structure
                    idCode={structure.idCode}
                    width={70}
                    height={50}
                    autoCrop={false}
                  />
                ) : null}
              </ClickToCopy>
              <ClickToCopy
                as="td"
                className="mono"
                value={entry.label}
                label="ligand code"
              >
                {entry.label}
              </ClickToCopy>
              <ClickToCopy
                as="td"
                className="mf-cell"
                value={entry.mf}
                label="molecular formula"
              >
                <MF mf={entry.mf} />
              </ClickToCopy>
              <ClickToCopy
                as="td"
                className="ligand-name"
                value={entry.name ?? ''}
                label="ligand name"
                title={
                  entry.name
                    ? `Copy the ligand name (${entry.name})`
                    : undefined
                }
                disabled={!entry.name}
              >
                {entry.name ?? ''}
              </ClickToCopy>
              <td className="num">{entry.number}</td>
            </tr>
          );
        })}
        {sorted.length === 0 && (
          <tr>
            <td colSpan={6} className="placeholder">
              No ligand records.
            </td>
          </tr>
        )}
      </tbody>
    </HTMLTable>
  );
}

/** A resolved CCD structure, plus the SMILES its cell copies. */
interface LigandStructure extends LigandSummary {
  /** Isomeric SMILES of the canonical structure. */
  smiles: string;
}

/**
 * Resolve each ligand code to a `{ idCode, coordinates }` pair via the
 * batched `/v1/ligands?codes=...` endpoint. Returns an empty map until the
 * fetch completes; failures degrade silently (the structure column stays
 * blank rather than blocking the page).
 * @param codes - Ligand 3-letter codes to resolve.
 * @returns Map of code → ligand summary (with idCode, coordinates and SMILES).
 */
function useStructuresByCode(codes: string[]): Map<string, LigandStructure> {
  const cacheKey = codes.toSorted().join(',');
  const [structures, setStructures] = useState<Map<string, LigandStructure>>(
    () => new Map(),
  );
  useEffect(() => {
    let cancelled = false;
    if (cacheKey === '') {
      // No codes to resolve — fire-and-forget cleanup.
      return () => {
        cancelled = true;
      };
    }
    loadStructures(cacheKey.split(','))
      .then((map) => {
        if (!cancelled) setStructures(map);
      })
      .catch(() => {
        // Silent: the ligand API is optional for the browse page.
      });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);
  return structures;
}

/**
 * Fetch the canonical structures and read the SMILES each one copies.
 * `openchemlib` is imported dynamically so it stays out of the entry chunk,
 * behind the same boundary `<Structure>` already loads it through.
 * @param codes - Ligand 3-letter codes to resolve.
 * @returns Map of code → ligand summary plus its isomeric SMILES.
 */
async function loadStructures(
  codes: string[],
): Promise<Map<string, LigandStructure>> {
  const [response, { Molecule }] = await Promise.all([
    fetchLigandsByCodes(codes),
    import('openchemlib'),
  ]);
  const map = new Map<string, LigandStructure>();
  for (const ligand of response.ligands) {
    map.set(ligand.code, {
      ...ligand,
      smiles: Molecule.fromIDCode(ligand.idCode).toIsomericSmiles(),
    });
  }
  return map;
}
