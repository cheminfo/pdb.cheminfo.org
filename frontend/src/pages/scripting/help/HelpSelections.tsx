import { Callout, HTMLTable } from '@blueprintjs/core';
import { ClickToCopy } from 'react-cheminfo/ui';

import CodeBlock from './CodeBlock.tsx';
import HelpToc from './HelpToc.tsx';
import RichText from './RichText.tsx';
import { SELECTION_CATEGORIES } from './data/selections.ts';
import { TOC_BY_TAB, selectionDomId } from './toc.ts';

/**
 * The "Selections" tab: the little language for naming atoms. This is the
 * half of the API worth learning properly — everything else is a way of
 * drawing whatever you name here.
 */

/**
 * Render the selection-grammar tab.
 * @returns The tab content.
 */
export default function HelpSelections() {
  return (
    <div className="help-tab text-selectable">
      <HelpToc entries={TOC_BY_TAB.selections} />
      <Callout intent="primary" icon="search-around" className="help-big-idea">
        <p>
          A selection expression is a short piece of text that answers one
          question: <em>which atoms?</em> It is the same idea as a search box —
          you describe what you want, and you get everything that matches.
        </p>
      </Callout>

      <section>
        <p>
          Hand one to <code>pdb.select(...)</code>, in quotes, and you get back
          something you can draw, measure or zoom to:
        </p>
        <CodeBlock>{`pdb.select('within 4 of PLP and not water').bonds.color({ model: 'atoms' });`}</CodeBlock>
        <p>
          Capitals inside the quotes do not matter —{' '}
          <code>&apos;plp&apos;</code> and <code>&apos;PLP&apos;</code> are the
          same thing. If a selection matches nothing you get no error and no
          picture, which is the usual reason a scene comes up blank.
        </p>
      </section>

      {SELECTION_CATEGORIES.map((category) => (
        <section key={category.id} id={selectionDomId(category.id)}>
          <h3>{category.title}</h3>
          <p>
            <RichText>{category.intro}</RichText>
          </p>
          <HTMLTable className="help-table" compact striped>
            <thead>
              <tr>
                <th>Expression</th>
                <th>Selects</th>
              </tr>
            </thead>
            <tbody>
              {category.rows.map((row) => (
                <tr key={row.expression}>
                  <td>
                    <ClickToCopy
                      as="code"
                      value={row.expression}
                      label="selection expression"
                    >
                      {row.expression}
                    </ClickToCopy>
                  </td>
                  <td>{row.description}</td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        </section>
      ))}

      <section>
        <h3>Narrowing an existing selection</h3>
        <p>
          Calling <code>.select(...)</code> on a selection narrows it instead of
          starting over. Useful when you have already named something and want a
          part of it.
        </p>
        <CodeBlock>{`const cys = pdb.select('[CYS]');   // every cysteine
const sulfurs = cys.select('.SG');  // just their thiol sulfurs
const pocket = pdb.select('within 5 of PLP');
const pocketProtein = pocket.select('protein');  // no water, no ligand`}</CodeBlock>
      </section>
    </div>
  );
}
