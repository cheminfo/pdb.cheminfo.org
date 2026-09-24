import { SegmentedControl } from '@blueprintjs/core';
import { useMemo, useState } from 'react';

interface PdbHeaderProps {
  /** Raw PDB-format text. */
  pdb: string;
}

/**
 * Pre-formatted display of the PDB file. Defaults to showing every record
 * before the first ATOM/HETATM line; a toggle reveals the full file including
 * coordinates.
 * @param props - Component props.
 * @param props.pdb - Raw PDB-format text.
 * @returns Pre-formatted header element with a header/full toggle.
 */
export default function PdbHeader({ pdb }: PdbHeaderProps) {
  const [view, setView] = useState<'header' | 'full'>('header');
  const headerOnly = useMemo(() => {
    const lines: string[] = [];
    for (const line of pdb.split(/\r?\n/)) {
      const field = line.slice(0, 6);
      if (field === 'ATOM  ' || field === 'HETATM') break;
      lines.push(line);
    }
    return lines.join('\n');
  }, [pdb]);
  return (
    <>
      <div className="pdb-header-bar">
        <h3>PDB header</h3>
        <SegmentedControl
          size="small"
          value={view}
          onValueChange={(next) => setView(next as 'header' | 'full')}
          options={[
            { label: 'Header only', value: 'header' },
            { label: 'Full PDB', value: 'full' },
          ]}
        />
      </div>
      <pre className="pdb-header text-selectable">
        {view === 'full' ? pdb : headerOnly}
      </pre>
    </>
  );
}
