import { Button, Card, Tab, Tabs, Tag } from '@blueprintjs/core';
import { useCallback, useRef, useState } from 'react';
import { ClickToCopy, PagePart } from 'react-cheminfo/ui';
import { Link } from 'react-router';
import { FullScreenProvider } from 'react-science/ui';

import type { FocusSpec, PdbViewerHandle } from '../../shared/PdbViewer.tsx';
import { fetchPdbText } from '../../shared/api/client.ts';
import type { PdbDoc } from '../../shared/api/types.ts';
import { useAsync } from '../../shared/useAsync.ts';
import type {
  BackgroundName,
  ColorName,
  RepresentationName,
} from '../../shared/viewerOptions.ts';
import {
  DEFAULT_BACKGROUND,
  DEFAULT_COLOR,
  DEFAULT_REPRESENTATION,
} from '../../shared/viewerOptions.ts';

import BrowseViewerCard from './BrowseViewerCard.tsx';
import LigandsTable from './LigandsTable.tsx';
import PdbHeader from './PdbHeader.tsx';
import StructureTable from './StructureTable.tsx';

interface SelectedEntryProps {
  doc: PdbDoc;
}

type SideTab = 'ligands' | 'helices' | 'sheets';

interface SideTabsProps {
  doc: PdbDoc;
  selectedKey?: string;
  onFocus: (key: string | null, spec: FocusSpec | null) => void;
}

/**
 * Tabbed view of the selected entry's ligands, helices, and sheets.
 * @param props - Component props.
 * @param props.doc - The currently-selected PDB document.
 * @param props.selectedKey - Stable key of the row currently focused in the viewer.
 * @param props.onFocus - Called when the user toggles a row's focus button.
 * @returns Tab strip + active tab body.
 */
function SideTabs({ doc, selectedKey, onFocus }: SideTabsProps) {
  const [active, setActive] = useState<SideTab>('ligands');

  const tabs: Array<{ id: SideTab; label: string; count: number }> = [
    { id: 'ligands', label: 'Ligands', count: doc.formula.length },
    { id: 'helices', label: 'Helices', count: doc.helices.length },
    { id: 'sheets', label: 'Sheets', count: doc.sheets.length },
  ];

  function renderTabBody() {
    if (active === 'ligands') {
      return (
        <LigandsTable
          formula={doc.formula}
          selectedKey={selectedKey}
          onFocus={onFocus}
        />
      );
    }
    if (active === 'helices') {
      return (
        <StructureTable
          kind="helix"
          rows={doc.helices}
          extraColumns={[{ header: 'Kind', render: (helix) => helix.kind }]}
          selectedKey={selectedKey}
          onFocus={onFocus}
        />
      );
    }
    return (
      <StructureTable
        kind="sheet"
        rows={doc.sheets}
        selectedKey={selectedKey}
        onFocus={onFocus}
      />
    );
  }

  return (
    <div className="side-tabs">
      <Tabs
        id="browse-side-tabs"
        selectedTabId={active}
        onChange={(tabId) => setActive(tabId as SideTab)}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            title={
              <span className="side-tab-title">
                {tab.label}
                <Tag minimal round>
                  {tab.count}
                </Tag>
              </span>
            }
          />
        ))}
      </Tabs>
      <div className="side-tabpanel" role="tabpanel">
        {renderTabBody()}
      </div>
    </div>
  );
}

/**
 * Centre column (entry header + viewer + PDB header) and right column
 * (side tables) of the currently-selected entry, rendered as siblings of
 * the list inside `.browse-grid`.
 * @param props - Component props.
 * @param props.doc - The currently-selected PDB document.
 * @returns Fragment with the main column and the side column.
 */
export default function SelectedEntry({ doc }: SelectedEntryProps) {
  const fetchTextForId = useCallback(() => fetchPdbText(doc._id), [doc._id]);
  const pdbText = useAsync(fetchTextForId);
  const [representation, setRepresentation] = useState<RepresentationName>(
    DEFAULT_REPRESENTATION,
  );
  const [color, setColor] = useState<ColorName>(DEFAULT_COLOR);
  const [spin, setSpin] = useState(false);
  const [background, setBackground] =
    useState<BackgroundName>(DEFAULT_BACKGROUND);
  const viewerHandleRef = useRef<PdbViewerHandle | null>(null);

  // Side-table → viewer focus selection. The key is opaque ("ligand:HOH:3",
  // "helix:A:12:24:0", …) and uniquely identifies the active row across all
  // three tables. Reset during render when the active document changes — the
  // loci from the previous structure are no longer valid.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [trackedDocId, setTrackedDocId] = useState(doc._id);
  if (trackedDocId !== doc._id) {
    setTrackedDocId(doc._id);
    setFocusKey(null);
  }

  const handleFocus = useCallback(
    (key: string | null, spec: FocusSpec | null) => {
      setFocusKey(key);
      viewerHandleRef.current?.focus(spec);
    },
    [],
  );

  return (
    <>
      <div className="browse-main">
        <Card className="panel browse-entry-header">
          <div className="browse-entry-top">
            <div className="browse-entry-id-row">
              <ClickToCopy
                as="div"
                className="browse-entry-id"
                value={doc._id}
                label="PDB code"
              >
                {doc._id}
              </ClickToCopy>
              <PagePart part="scripting">
                <Link
                  to={`/scripting/${encodeURIComponent(doc._id)}`}
                  title={`Open ${doc._id} in the scripting page`}
                >
                  <Button variant="minimal" icon="code" endIcon="arrow-right">
                    Open in Scripting
                  </Button>
                </Link>
              </PagePart>
            </div>
            <div className="browse-entry-meta">
              <span>
                <strong>Chains:</strong> {doc.nbChains}
              </span>
              <span>
                <strong>Residues:</strong> {doc.nbResidues}
              </span>
              {doc.year !== undefined && (
                <span>
                  <strong>Year:</strong> {doc.year}
                </span>
              )}
              {doc.experiment && (
                <span>
                  <strong>Method:</strong> {doc.experiment}
                </span>
              )}
            </div>
          </div>
          <ClickToCopy
            as="div"
            className="browse-entry-title"
            value={doc.title}
            label="title"
            disabled={!doc.title}
          >
            {doc.title}
          </ClickToCopy>
        </Card>
        <div className="browse-entry-grid">
          <PagePart part="viewer">
            <FullScreenProvider>
              {(fullscreenRef) => (
                <div
                  ref={fullscreenRef}
                  className="browse-viewer-fullscreen-wrap"
                >
                  <BrowseViewerCard
                    pdbText={pdbText}
                    representation={representation}
                    onRepresentationChange={setRepresentation}
                    color={color}
                    onColorChange={setColor}
                    spin={spin}
                    onSpinToggle={() => setSpin((value) => !value)}
                    background={background}
                    onBackgroundChange={setBackground}
                    viewerHandleRef={viewerHandleRef}
                  />
                </div>
              )}
            </FullScreenProvider>
          </PagePart>
          <PagePart part="pdbHeader">
            <Card className="panel browse-pdb-text">
              {pdbText.status === 'success' ? (
                <PdbHeader pdb={pdbText.data} />
              ) : (
                <>
                  <h3>PDB header</h3>
                  <p className="placeholder">…</p>
                </>
              )}
            </Card>
          </PagePart>
        </div>
      </div>
      <PagePart part="annotations">
        <Card className="panel browse-side">
          <SideTabs
            doc={doc}
            selectedKey={focusKey ?? undefined}
            onFocus={handleFocus}
          />
        </Card>
      </PagePart>
    </>
  );
}
