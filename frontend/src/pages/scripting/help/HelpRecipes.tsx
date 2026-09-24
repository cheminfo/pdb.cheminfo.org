import { Callout } from '@blueprintjs/core';

import CodeBlock from './CodeBlock.tsx';
import HelpToc from './HelpToc.tsx';
import { RECIPES } from './data/recipes.ts';
import { TOC_BY_TAB, recipeDomId } from './toc.ts';

/**
 * The "Recipes" tab: complete, self-contained scripts for the figures people
 * actually need. Every one runs as-is — copy it, then change the residue code.
 */

/**
 * Render the recipes tab.
 * @returns The tab content.
 */
export default function HelpRecipes() {
  return (
    <div className="help-tab text-selectable">
      <HelpToc entries={TOC_BY_TAB.recipes} />
      <Callout icon="clipboard" className="help-next">
        Each recipe is a whole script: copy it, press Run, then start changing
        things. The fastest way to learn this API is to break a working example
        rather than to build one from nothing. Most recipes assume a ligand
        called <code>PLP</code> — swap in whatever <code>pdb.ligands</code>{' '}
        reports for your structure.
      </Callout>

      {RECIPES.map((recipe) => (
        <section
          key={recipe.id}
          id={recipeDomId(recipe.id)}
          className="help-recipe"
        >
          <h3>{recipe.title}</h3>
          <p>{recipe.goal}</p>
          <CodeBlock>{recipe.code}</CodeBlock>
        </section>
      ))}

      <Callout icon="lightbulb" className="help-next">
        The example buttons above the editor (<em>Global view</em>,{' '}
        <em>Display helix</em>, <em>Ramachandran</em>, …) load longer, fully
        commented scripts built on exactly these patterns. They are worth
        reading once you are comfortable here.
      </Callout>
    </div>
  );
}
