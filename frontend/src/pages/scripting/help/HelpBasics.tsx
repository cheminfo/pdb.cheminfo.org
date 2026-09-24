import { Button, Callout } from '@blueprintjs/core';
import { useState } from 'react';

import ConceptCard from './ConceptCard.tsx';
import HelpToc from './HelpToc.tsx';
import { CONCEPTS } from './data/concepts.ts';
import { TOC_BY_TAB } from './toc.ts';

/**
 * The "Basics" tab: the programming ideas behind the scripts, each as a
 * collapsible card. Nothing here is specific to proteins — it is the
 * JavaScript a chemist needs, and no more.
 */

/**
 * Render the programming-basics tab.
 * @returns The tab content.
 */
export default function HelpBasics() {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const allOpen = openIds.size === CONCEPTS.length;

  return (
    <div className="help-tab text-selectable">
      <HelpToc entries={TOC_BY_TAB.basics} />
      <Callout icon="learning" className="help-next">
        You do not need to learn programming to use this page — you need about
        fifteen minutes of it. Each card below is one idea, and they are ordered
        so that reading straight down works. Open the ones you need and ignore
        the rest.
      </Callout>

      <div className="help-toolbar">
        <Button
          size="small"
          variant="minimal"
          icon={allOpen ? 'collapse-all' : 'expand-all'}
          onClick={() =>
            setOpenIds(allOpen ? new Set() : new Set(CONCEPTS.map((c) => c.id)))
          }
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>

      <div className="help-concepts">
        {CONCEPTS.map((concept) => (
          <ConceptCard
            key={concept.id}
            concept={concept}
            isOpen={openIds.has(concept.id)}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}
