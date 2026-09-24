import { Callout, HTMLTable } from '@blueprintjs/core';

import CodeBlock from './CodeBlock.tsx';
import HelpToc from './HelpToc.tsx';
import RichText from './RichText.tsx';
import { COLOR_FORMS, REFERENCE_GROUPS } from './data/reference.ts';
import { TOC_BY_TAB, referenceDomId } from './toc.ts';

/**
 * The "Reference" tab: every object and method, grouped by the thing you are
 * holding. Each group opens with a plain-language sentence saying what that
 * object is, so the list is readable top to bottom and not only as a lookup.
 */

/**
 * Render the API reference tab.
 * @returns The tab content.
 */
export default function HelpReference() {
  return (
    <div className="help-tab text-selectable">
      <HelpToc entries={TOC_BY_TAB.reference} />
      <Callout icon="info-sign" className="help-next">
        Looking for something specific? The search box at the top searches this
        reference along with everything else. The editor also autocompletes:
        type <code>ms.</code> and press <kbd>Ctrl</kbd>+<kbd>Space</kbd>.
      </Callout>

      {REFERENCE_GROUPS.map((group) => (
        <section key={group.id} id={referenceDomId(group.id)}>
          <h3>{group.title}</h3>
          <p className="help-group-intro">
            <RichText>{group.intro}</RichText>
          </p>
          <dl className="help-methods">
            {group.entries.map((entry) => (
              <div key={entry.signature} className="help-method">
                <dt>
                  <code>{entry.signature}</code>
                </dt>
                <dd>
                  <p>
                    <RichText>{entry.description}</RichText>
                  </p>
                  <CodeBlock>{entry.example}</CodeBlock>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section id={referenceDomId('colors')}>
        <h3>Colours</h3>
        <p className="help-group-intro">
          Every <code>color(...)</code> call takes one of these. The first form
          is a fixed colour you choose; the <code>model</code> forms let the
          data choose, which is usually what makes a figure informative rather
          than merely pretty.
        </p>
        <HTMLTable className="help-table" compact striped>
          <thead>
            <tr>
              <th>Written as</th>
              <th>Gives you</th>
            </tr>
          </thead>
          <tbody>
            {COLOR_FORMS.map((form) => (
              <tr key={form.spec}>
                <td>
                  <code>{form.spec}</code>
                </td>
                <td>
                  <RichText>{form.description}</RichText>
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
        <CodeBlock>{`pdb.select('protein').ribbon.color('lightgrey');            // fixed
pdb.select('protein').ribbon.color({ model: 'chain' });     // by data
pdb.select('protein').surface.color({                       // and transparent
  color: { model: 'hydrophobicity' },
  alpha: 0.6,
});`}</CodeBlock>
      </section>

      <section id={referenceDomId('notes')}>
        <h3>Good to know</h3>
        <ul>
          <li>
            <strong>An empty selection is silent.</strong> No error, no picture.
            If a scene is blank, check that the residue code really is in this
            file — <code>pdb.ligands</code> and <code>pdb.chains</code> tell
            you.
          </li>
          <li>
            <strong>
              <code>helix</code> and <code>sheet</code> come from the file, not
              from geometry.
            </strong>{' '}
            They read the HELIX and SHEET records. A file without those records
            selects nothing, even though the helices are plainly there.
          </li>
          <li>
            <strong>Spin outlives your script.</strong> It keeps going after the
            last line, and into the next Run. Stop it with{' '}
            <code>ms.spin(&apos;off&apos;)</code>.
          </li>
          <li>
            <strong>
              <code>hbonds</code> looks inside; <code>contactsWith</code> looks
              between.
            </strong>{' '}
            For the hydrogen bonds holding one helix together, use{' '}
            <code>selection.hbonds.show()</code>. For a ligand against its
            pocket, use <code>contactsWith</code> — it deliberately ignores
            contacts within a single group, so it will find nothing inside one
            chain.
          </li>
          <li>
            <strong>Labels draw their own text.</strong>{' '}
            <code>label(template)</code> uses the template only to pick residue,
            atom or chain level. Custom text is not supported yet.
          </li>
          <li>
            <strong>Hiding is real.</strong> Every channel, every selection and
            every kind has <code>show()</code> and <code>hide()</code>, and they
            remember colours and sizes — so hide and re-show gets you exactly
            what you had. Use it to reveal a scene layer by layer.
          </li>
          <li>
            <strong>
              No <code>moveto</code>.
            </strong>{' '}
            Explicit camera matrices are not supported. Use{' '}
            <code>selection.focus()</code>, <code>selection.zoom(factor)</code>{' '}
            or <code>ms.fit()</code>.
          </li>
        </ul>
      </section>
    </div>
  );
}
