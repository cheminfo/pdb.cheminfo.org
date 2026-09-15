import { Button, ButtonGroup, HTMLTable } from '@blueprintjs/core';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useListKeyboardNavigation } from 'react-cheminfo/ui';

import type { PdbDoc } from '../../shared/api/types.ts';

interface PdbTableProps {
  /** PDB documents to display, in the order they should appear. */
  rows: PdbDoc[];
  /** Currently-selected PDB id, used to highlight the active row. */
  selectedId: string | undefined;
  /** Called when the user clicks a row. */
  onSelect: (id: string) => void;
}

const PAGE_STEP = 10;

type ThumbnailSize = 0 | 100 | 200 | 400;
const THUMBNAIL_SIZES: ThumbnailSize[] = [0, 100, 200, 400];

/**
 * List of PDB entries (ID, title). Clicking a row promotes that entry to
 * the active selection. Once the list has keyboard focus, ArrowUp /
 * ArrowDown move the selection one step, PageUp / PageDown move ten steps,
 * and Home / End jump to the first / last entry. The selected row is
 * scrolled into view.
 * @param props - Component props.
 * @param props.rows - PDB documents to display.
 * @param props.selectedId - Currently-selected PDB id.
 * @param props.onSelect - Called with the new id when the user clicks a row
 *   or moves with the keyboard.
 * @returns Scrollable table of PDB entries.
 */
export default function PdbTable({
  rows,
  selectedId,
  onSelect,
}: PdbTableProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>(0);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const handleKeyDown = useListKeyboardNavigation({
    length: rows.length,
    selectedIndex: rows.findIndex((row) => row._id === selectedId),
    pageStep: PAGE_STEP,
    onSelect: (index) => {
      const nextRow = rows[index];
      if (nextRow) onSelect(nextRow._id);
    },
  });

  return (
    <div className="pdb-table-host">
      <div className="pdb-table-toolbar">
        <span className="pdb-table-toolbar-label">Thumbnail</span>
        <ButtonGroup>
          {THUMBNAIL_SIZES.map((size) => (
            <Button
              key={size}
              size="small"
              active={thumbnailSize === size}
              onClick={() => setThumbnailSize(size)}
            >
              {size === 0 ? 'Off' : `${String(size)}px`}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <div
        ref={wrapperRef}
        className="pdb-table-wrapper"
        tabIndex={0}
        role="listbox"
        aria-activedescendant={selectedId ? `pdb-row-${selectedId}` : undefined}
        onKeyDown={handleKeyDown}
      >
        <HTMLTable className="pdb-table" interactive compact>
          <colgroup>
            <col className="col-id" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = row._id === selectedId;
              const handleClick = () => {
                onSelect(row._id);
                wrapperRef.current?.focus();
              };
              return (
                <Fragment key={row._id}>
                  <tr
                    id={`pdb-row-${row._id}`}
                    ref={isSelected ? selectedRowRef : undefined}
                    role="option"
                    aria-selected={isSelected}
                    className={isSelected ? 'selected' : undefined}
                    onClick={handleClick}
                  >
                    <td className="mono">{row._id}</td>
                    <td className="title-cell" title={row.title}>
                      {row.title}
                    </td>
                  </tr>
                  {thumbnailSize > 0 && (
                    <tr
                      className={
                        isSelected ? 'pdb-thumb-row selected' : 'pdb-thumb-row'
                      }
                      onClick={handleClick}
                    >
                      <td colSpan={2} className="pdb-thumb-cell">
                        <img
                          src={`/v1/assemblies/${row._id}/image/${String(thumbnailSize)}x${String(thumbnailSize)}`}
                          alt=""
                          width={thumbnailSize}
                          height={thumbnailSize}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.classList.add('is-missing');
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </HTMLTable>
        {rows.length === 0 && (
          <p className="placeholder pdb-table-empty">
            No entries match the current search.
          </p>
        )}
      </div>
    </div>
  );
}
