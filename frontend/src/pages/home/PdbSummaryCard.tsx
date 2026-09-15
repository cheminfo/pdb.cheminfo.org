import type { ReactNode } from 'react';
import { formatInteger } from 'react-cheminfo/core';

import type { PdbDoc } from '../../shared/api/types.ts';

import type { PdbHeaderInfo } from './parsePdbHeader.ts';

interface PdbSummaryCardProps {
  /** Parsed PDB document for the entry (title, formula, chains, ...). */
  doc: PdbDoc;
  /** Fields extracted client-side from the raw PDB header text. */
  header: PdbHeaderInfo;
}

/**
 * Compact information card describing one PDB entry: title, source organism,
 * experimental method, chain composition, and ligand list. Built from the
 * parsed PDB document plus a few extra fields (`source`, `classification`)
 * extracted from the raw PDB header text.
 * @param props - Component props.
 * @param props.doc - Parsed PDB document for the entry.
 * @param props.header - Fields extracted from the raw PDB header text.
 * @returns Summary card React element.
 */
export default function PdbSummaryCard({ doc, header }: PdbSummaryCardProps) {
  const ligands = doc.formula.filter((entry) => entry.label !== 'HOH');
  const chains = Object.entries(doc.chain);
  const molecules = chains.map(([, chain]) => chain.molecule).filter(Boolean);
  const uniqueMolecules = [...new Set(molecules)];

  return (
    <div className="pdb-summary">
      <div className="pdb-summary-header">
        <span className="pdb-summary-id">{doc._id}</span>
        {header.classification && (
          <span className="pdb-summary-tag">{header.classification}</span>
        )}
      </div>
      <h3 className="pdb-summary-title">{doc.title || 'Untitled'}</h3>

      <dl className="pdb-summary-list">
        {uniqueMolecules.length > 0 && (
          <SummaryRow label="Molecule">
            {uniqueMolecules.join(' / ')}
          </SummaryRow>
        )}
        {header.sourceOrganisms.length > 0 && (
          <SummaryRow label="Source">
            <em>{header.sourceOrganisms.join(', ')}</em>
          </SummaryRow>
        )}
        <SummaryRow label="Method">
          {[doc.experiment, header.resolution, doc.year]
            .filter(Boolean)
            .join(' · ') || '–'}
        </SummaryRow>
        <SummaryRow label="Composition">
          {`${doc.nbChains} chain${doc.nbChains === 1 ? '' : 's'}, ${formatInteger(doc.nbResidues)} residues`}
        </SummaryRow>
        {ligands.length > 0 && (
          <SummaryRow label={`Ligands (${ligands.length})`}>
            <ul className="pdb-summary-ligands">
              {ligands.slice(0, 8).map((ligand) => (
                <li key={ligand.label}>
                  <code>{ligand.label}</code>
                  {ligand.name ? ` — ${ligand.name.toLowerCase()}` : ''}
                </li>
              ))}
              {ligands.length > 8 && (
                <li className="pdb-summary-ligands-more">
                  …and {ligands.length - 8} more
                </li>
              )}
            </ul>
          </SummaryRow>
        )}
        {header.depositionDate && (
          <SummaryRow label="Deposited">{header.depositionDate}</SummaryRow>
        )}
      </dl>
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  children: ReactNode;
}

function SummaryRow({ label, children }: SummaryRowProps) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
