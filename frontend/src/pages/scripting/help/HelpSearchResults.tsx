import { Callout, NonIdealState, Tag } from '@blueprintjs/core';

import CodeBlock from './CodeBlock.tsx';
import RichText from './RichText.tsx';
import type { HelpResult } from './search.ts';

/**
 * Search results across every tab. Shown in place of the tabs while the
 * search box has content, so there is only ever one thing on screen.
 */

interface HelpSearchResultsProps {
  /** The current query, echoed in the empty state. */
  query: string;
  /** Matches, already ranked. */
  results: HelpResult[];
}

/**
 * Render the search-results view.
 * @param props - Component props.
 * @param props.query - The current query.
 * @param props.results - Ranked matches.
 * @returns The results list, or an empty state.
 */
export default function HelpSearchResults({
  query,
  results,
}: HelpSearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="help-tab text-selectable">
        <NonIdealState
          icon="search"
          title="Nothing found"
          description={
            <span>
              No help entry matches <strong>{query}</strong>. Try a single word
              — <code>colour</code>, <code>chain</code>, <code>distance</code> —
              or the name of a method such as <code>zoom</code>.
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="help-tab text-selectable">
      <Callout icon="search" className="help-next">
        {results.length} {results.length === 1 ? 'match' : 'matches'} for{' '}
        <strong>{query}</strong>. Clear the box to get the tabs back.
      </Callout>

      <div className="help-results">
        {results.map((result) => (
          <div key={result.id} className="help-result">
            <div className="help-result-head">
              <code className="help-result-title">{result.title}</code>
              <Tag minimal>{result.section}</Tag>
            </div>
            <p className="help-result-description">
              <RichText>{result.description}</RichText>
            </p>
            {result.code && <CodeBlock>{result.code}</CodeBlock>}
          </div>
        ))}
      </div>
    </div>
  );
}
