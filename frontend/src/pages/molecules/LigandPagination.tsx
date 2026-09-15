import { Button, ButtonGroup } from '@blueprintjs/core';
import { formatInteger } from 'react-cheminfo/core';

interface LigandPaginationProps {
  /** Total matches, before pagination. */
  total: number;
  /** Page size. */
  limit: number;
  /** Number of matches skipped by the current page. */
  offset: number;
  /** Called with the offset of the page to show. */
  onOffsetChange: (offset: number) => void;
  /** Number of rows in the current page — 0 while a page is loading. */
  pageSize: number;
}

/**
 * Pager shown under the ligand results table: reports the visible range and
 * the total number of matches, and steps through pages.
 * @param props - Component props.
 * @param props.total - Total matches, before pagination.
 * @param props.limit - Page size.
 * @param props.offset - Offset of the current page.
 * @param props.onOffsetChange - Page-change handler.
 * @param props.pageSize - Number of rows in the current page.
 * @returns Pagination React element.
 */
export default function LigandPagination({
  total,
  limit,
  offset,
  onOffsetChange,
  pageSize,
}: LigandPaginationProps) {
  const first = pageSize === 0 ? 0 : offset + 1;
  const last = offset + pageSize;
  const lastOffset = Math.max(0, Math.floor((total - 1) / limit) * limit);
  return (
    <div className="molecules-pagination">
      <span className="molecules-pagination-summary">
        {total === 0
          ? 'No ligands'
          : `${formatInteger(first)}–${formatInteger(last)} of ${formatInteger(total)} ligands`}
      </span>
      <ButtonGroup size="small">
        <Button
          icon="double-chevron-left"
          disabled={offset === 0}
          onClick={() => onOffsetChange(0)}
          title="First page"
          aria-label="First page"
        />
        <Button
          icon="chevron-left"
          disabled={offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          title="Previous page"
          aria-label="Previous page"
        />
        <Button
          icon="chevron-right"
          disabled={offset >= lastOffset}
          onClick={() => onOffsetChange(Math.min(lastOffset, offset + limit))}
          title="Next page"
          aria-label="Next page"
        />
        <Button
          icon="double-chevron-right"
          disabled={offset >= lastOffset}
          onClick={() => onOffsetChange(lastOffset)}
          title="Last page"
          aria-label="Last page"
        />
      </ButtonGroup>
    </div>
  );
}
