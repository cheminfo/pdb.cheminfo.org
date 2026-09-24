import { Callout, HTMLTable } from '@blueprintjs/core';

import CodeBlock from './CodeBlock.tsx';
import HelpToc from './HelpToc.tsx';
import { TOC_BY_TAB } from './toc.ts';

/**
 * The "Start here" tab: the mental model behind the scripting API, written
 * for a chemist or biologist who has never scripted. Everything else in the
 * help is a detail of the one idea on this page.
 */

const VOCABULARY: Array<[string, string, string]> = [
  [
    'ms',
    'the viewer',
    'The microscope. It owns the camera, the titles on screen, and nothing else. You make one, once, at the top: const ms = new MolStar().',
  ],
  [
    'pdb',
    'the structure',
    'The sample on the stage. It knows the chains, the ligands, the helices — and it is the only thing that can hand you a selection.',
  ],
  [
    'a selection',
    'a group of atoms',
    'The tweezers. "PLP", "chain A", "everything within 4 Å of the ligand". A selection draws nothing on its own; it just names some atoms.',
  ],
  [
    'a channel',
    'a way of drawing',
    'The stain. Every selection has four: atoms (spheres), bonds (sticks), ribbon (cartoon) and surface — plus hbonds and distances for measuring.',
  ],
];

/**
 * Render the philosophy / getting-started tab.
 * @returns The tab content.
 */
export default function HelpPhilosophy() {
  return (
    <div className="help-tab text-selectable">
      <HelpToc entries={TOC_BY_TAB.start} />
      <Callout intent="primary" icon="lightbulb" className="help-big-idea">
        <p>
          Every script you will ever write here is the same sentence, over and
          over:
        </p>
        <p className="help-big-idea-line">
          “Take <em>these</em> atoms, and draw them <em>that</em> way.”
        </p>
        <p>
          Learn to write that one sentence and you have learned the whole thing.
          The rest is vocabulary.
        </p>
      </Callout>

      <section id="help-philosophy-sentence">
        <h3>The sentence, in code</h3>
        <p>
          Read it left to right, out loud. A dot means “belonging to”, so this
          says: “ask <code>pdb</code> to select the PLP residues, take their
          spheres, and colour them green”.
        </p>
        <pre className="help-anatomy">
          {`pdb.select('PLP').atoms.color('limegreen');
│                │     │
│                │     └─ what it looks like
│                └─────── how to draw them
└──────────────────────── which atoms`}
        </pre>
        <p>
          Change the first part and you are pointing at different atoms. Change
          the middle and you are drawing them differently. Change the end and
          you are restyling them. That is the entire language.
        </p>
      </section>

      <section id="help-philosophy-vocabulary">
        <h3>The four things you work with</h3>
        <HTMLTable className="help-table" compact striped>
          <thead>
            <tr>
              <th>Name</th>
              <th>Is</th>
              <th>Think of it as</th>
            </tr>
          </thead>
          <tbody>
            {VOCABULARY.map(([name, is, description]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>{is}</td>
                <td>{description}</td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
        <p>
          They always come in that order: the viewer loads the structure, the
          structure gives you selections, and selections carry channels. If you
          are ever lost, ask yourself which of the four you are holding.
        </p>
      </section>

      <section id="help-philosophy-why">
        <h3>Why script it instead of clicking?</h3>
        <p>
          Clicking is faster — once. A script wins on everything that happens
          afterwards.
        </p>
        <ul className="help-why">
          <li>
            <strong>It is reproducible.</strong> The script <em>is</em> the
            figure. Run it next year, on a new release of the viewer, and you
            get the same image — not something you half-remember making.
          </li>
          <li>
            <strong>It is precise.</strong> “Every atom within 3.5 Å of the
            ligand” is exact and complete. The same selection made by hand is a
            guess, and it silently misses one.
          </li>
          <li>
            <strong>It is shareable.</strong> A paragraph of text describes an
            entire figure. Paste it in an email; a colleague reruns it on their
            own structure.
          </li>
          <li>
            <strong>It scales.</strong> Colouring 200 chains is the same three
            lines as colouring two. A loop does not get bored or make mistakes.
          </li>
          <li>
            <strong>It moves.</strong> Rotations, pauses and layers that appear
            one at a time turn a static picture into an explanation. You cannot
            click a movie.
          </li>
        </ul>
      </section>

      <section id="help-philosophy-rules">
        <h3>Three rules that save an hour</h3>
        <ol className="help-rules">
          <li>
            <strong>Select, then draw — always in that order.</strong> Nothing
            appears until you touch a channel. A bare{' '}
            <code>pdb.select(&apos;PLP&apos;)</code> on its own line does
            precisely nothing, and that is by design.
          </li>
          <li>
            <strong>Layers stack; repeats merge.</strong> The same atoms can
            wear spheres <em>and</em> a ribbon <em>and</em> a surface at once —
            those are different channels. But calling{' '}
            <code>bonds.color(...)</code> twice does not draw two sets of
            sticks; the second call updates the first. So you can safely restyle
            something without cleaning up after yourself.
          </li>
          <li>
            <strong>Every Run starts from a clean slate.</strong> The canvas is
            wiped before your first line. That is what makes the script a
            complete, honest description of the scene: there is no invisible
            state left over from the last run to explain what you are seeing.
          </li>
        </ol>
      </section>

      <section id="help-philosophy-first">
        <h3>Your first script</h3>
        <p>
          Paste this in and press Run. Every line is one step of the sentence
          above.
        </p>
        <CodeBlock>{`const ms = new MolStar();       // the viewer
const pdb = ms.loadPDB(text);   // the structure
ms.hideDefaults();              // start from a blank canvas

ms.echo('My first scene', { size: 28 });

// A faint ribbon for context, coloured by secondary structure.
pdb.all.ribbon.color({ model: 'structure' });

// The ligand, in thick sticks, coloured like a chemist expects.
const ligand = pdb.select('ligand');
ligand.bonds.diameter(0.25).color({ model: 'atoms' });

// Look at it, and turn slowly.
ligand.zoom(0.5, { seconds: 1.5 });
ms.spin('y', 20);`}</CodeBlock>
        <p>
          If nothing shows up, the structure probably has no ligand — try{' '}
          <code>ms.echo(pdb.ligands.join(&apos; &apos;))</code> to see what it
          actually contains. An empty selection is the single most common
          surprise, and it is never an error message.
        </p>
      </section>

      <Callout icon="direction-right" className="help-next">
        <strong>Where to go next.</strong> <em>Basics</em> explains the
        programming ideas — variables, loops, quotes — one collapsible card at a
        time. <em>Selections</em> is the grammar for naming atoms, and it is the
        part worth learning properly. <em>Reference</em> lists every method.{' '}
        <em>Recipes</em> has complete scripts for the usual figures. Or just
        search — the box at the top covers all of them at once.
      </Callout>
    </div>
  );
}
