/**
 * Demonstration scenes. Each `code` string is exactly what gets loaded into the editor when the user
 * clicks the matching button on the Scripting page.
 *
 * Scripts are written in the synchronous-looking style: the runner
 * (`runScript.ts` → `rewriteAwait.ts`) injects `await` automatically before
 * every call to a `Promise`-returning method. Explicit `await` is also
 * accepted for power users.
 */
export interface Scene {
  id: string;
  label: string;
  code: string;
}

/**
 * Protein the built-in teaching scenes were written against. Every other
 * entry starts from `SAFE_GLOBAL_VIEW` instead — see `scenesForProtein`.
 */
export const DEFAULT_PDB_ID = '8ZXR';

const SAFE_GLOBAL_VIEW = `// Global view — written to work on ANY PDB entry.
// Every step asks the structure what it actually contains before drawing,
// so an entry with no ligand, no water or no secondary structure still
// renders correctly instead of failing halfway through.
const ms = new MolStar();
const pdb = ms.loadPDB(text);
ms.hideDefaults();

// A blank chain id is stored as ' ' and can't be selected — drop those.
const chains = pdb.chains.filter((c) => c.trim() !== '');
const chainColors = ['steelblue', 'salmon', 'mediumseagreen', 'mediumpurple'];
const chainColor = (i) => chainColors[i % chainColors.length];

// Step 1 — one color per chain. 'polymer' covers proteins AND nucleic
// acids, so DNA/RNA entries get a ribbon too.
ms.echo('Step 1 / 4 — ' + (chains.length || 1) + ' chain(s) ' + chains.join(' + '), {
  size: 22, italic: true,
});
if (chains.length === 0) {
  // No usable chain id in this entry — draw the whole polymer at once.
  pdb.select('polymer').ribbon.cartoon().color({ value: chainColor(0) });
} else {
  for (let i = 0; i < chains.length; i++) {
    pdb.select(':' + chains[i] + ' and polymer')
       .ribbon.cartoon().color({ value: chainColor(i) });
  }
}
// \`pdb.all\` always has atoms, so framing on it is always safe. Zooming on a
// selection that might be empty would fly the camera to the world origin.
pdb.all.zoom(0.9);
ms.rotate({ degrees: 360, speed: 60 });

// Step 2 — recolor by secondary structure, but only when the entry declares
// any: on a DNA/RNA entry this theme paints every chain the same color, which
// would throw away the per-chain colors from step 1 and show nothing new.
// Re-uses the SAME selections as step 1, so each ribbon is replaced in place
// rather than stacked on top (two cartoons over the same atoms would z-fight).
const hasSecondaryStructure = pdb.helices.length > 0 || pdb.sheets.length > 0;
ms.echo('Step 2 / 4 — ' + (hasSecondaryStructure
  ? pdb.helices.length + ' helices, ' + pdb.sheets.length + ' strands'
  : 'no secondary structure declared — keeping chain colors'), {
  size: 22, italic: true,
});
if (hasSecondaryStructure) {
  if (chains.length === 0) {
    pdb.select('polymer').ribbon.color({ model: 'structure' });
  } else {
    for (let i = 0; i < chains.length; i++) {
      pdb.select(':' + chains[i] + ' and polymer')
         .ribbon.color({ model: 'structure' });
    }
  }
}
ms.rotate({ degrees: 360, speed: 60 });

// Step 3 — every ligand (any HETATM group that isn't water) as
// ball-and-stick. The bracketed form '[XXX]' is required: a bare code that
// starts with a digit (e.g. 3PG) would not parse.
ms.echo('Step 3 / 4 — ' + pdb.ligands.length + ' ligand type(s)' +
        (pdb.ligands.length > 0 ? ': ' + pdb.ligands.join(', ') : ''), {
  size: 22, italic: true,
});
for (const name of pdb.ligands) {
  const ligand = pdb.select('[' + name + ']');
  ligand.bonds.diameter(0.2).color({ model: 'element' });
  ligand.atoms.radius({ value: 0.25 }).color({ model: 'element' });
}
ms.rotate({ degrees: 360, speed: 60 });

// Step 4 — waters, if the entry has any.
const waterCount = pdb.residues.filter((r) => r.resName === 'HOH').length;
ms.echo('Step 4 / 4 — ' + waterCount + ' water molecules', {
  size: 22, italic: true,
});
pdb.select('water').atoms.radius({ value: 0.35 }).color({ value: 'red' });

pdb.all.zoom(0.9);
ms.spin('y');
`;

const GLOBAL_VIEW = `// Global view built step by step. Each step adds one layer on top of the
// previous one and prints a title with the relevant count. Cysteines are
// never selected — they ride along inside the chain backbones / ribbons.
const ms = new MolStar();
const pdb = ms.loadPDB(text);
ms.hideDefaults();

const chainColors = ['steelblue', 'salmon', 'mediumseagreen', 'mediumpurple'];
const chainColor = (i) => chainColors[i % chainColors.length];
const COIL_COLOR = 'lightgrey';

// Step 1 — Two chains in different colors, no secondary structure.
//   Drawn as a backbone trace (bonds only) so the cartoon shapes of
//   helices and β-sheets are NOT visible yet — they come in steps 2 & 3.
ms.echo('Step 1 / 5 — Chains ' + pdb.chains.join(' + ') + ' (backbone trace)', {
  size: 24, italic: true,
});
for (let i = 0; i < pdb.chains.length; i++) {
  pdb.select(':' + pdb.chains[i] + ' and protein and backbone')
     .bonds.diameter(0.25).color({ value: chainColor(i) });
}
// Frame on the whole structure. Factor 1 fits the bounding sphere
// edge-to-edge with no extra margin; \`zoom()\` internally pins the
// camera so subsequent rep additions / visibility flips don't trigger
// Mol*'s auto-fit (which was tightening the view every time we added a
// tube or recoloured a ribbon).
pdb.all.zoom(1);
ms.rotate({ degrees: 360, speed: 60 });

// Step 2 — α-helices, in two beats so the build is easy to follow:
//   2a) Hide the ball-and-stick backbone and convert the whole protein
//       to a uniform light-grey tube (Mol*'s \`putty\` rep — ignores
//       secondary structure, so every residue looks like plain coil).
//       Chain identity is dropped here so the secondary-structure
//       highlights in steps 2b and 3 read clearly against a neutral
//       backdrop. We split the chain into three disjoint sub-selections
//       (coil / helix / sheet) so each region carries its own channel
//       state and can switch independently.
//   2b) Switch the helix sub-selections from tube to SS-aware cartoon,
//       coloured crimson. Because the channel key is the same, the
//       tube is REPLACED in place — no ugly tube under the cartoon.
ms.echo('Step 2 / 5 — Backbone → random-coil tube (no secondary structure)', {
  size: 24, italic: true,
});
ms.bonds.hide();
for (let i = 0; i < pdb.chains.length; i++) {
  pdb.select(':' + pdb.chains[i] + ' and protein and not helix and not sheet')
     .ribbon.tube().color({ value: COIL_COLOR });
  pdb.select(':' + pdb.chains[i] + ' and helix')
     .ribbon.tube().color({ value: COIL_COLOR });
  pdb.select(':' + pdb.chains[i] + ' and sheet')
     .ribbon.tube().color({ value: COIL_COLOR });
}
ms.rotate({ degrees: 360, speed: 60 });

ms.echo('Step 2 / 5 — ' + pdb.helices.length + ' α-helices', {
  size: 24, italic: true,
});
for (let i = 0; i < pdb.chains.length; i++) {
  pdb.select(':' + pdb.chains[i] + ' and helix')
     .ribbon.cartoon().color({ value: 'crimson' });
}
ms.rotate({ degrees: 360, speed: 60 });

// Step 3 — β-strands. Same trick: the per-chain sheet sub-selections
// switch in place from tube to cartoon, coloured gold. The grey coil
// tubes from step 2a stay as they are, so the random coil ↔ helix ↔
// sheet regions are painted from disjoint reps — no overlap, no z-fight.
ms.echo('Step 3 / 5 — ' + pdb.sheets.length + ' β-strands', {
  size: 24, italic: true,
});
for (let i = 0; i < pdb.chains.length; i++) {
  pdb.select(':' + pdb.chains[i] + ' and sheet')
     .ribbon.cartoon().color({ value: 'gold' });
}
ms.rotate({ degrees: 360, speed: 60 });

// Step 4 — Water molecules.
const waterCount = pdb.residues.filter((r) => r.resName === 'HOH').length;
ms.echo('Step 4 / 5 — ' + waterCount + ' water molecules', {
  size: 24, italic: true,
});
pdb.select('water').atoms.color({ value: 'red' }).radius({ value: 0.4 });
ms.rotate({ degrees: 360, speed: 60 });

// Step 5 — Inhibitor (HEC): ball-and-stick + translucent surface.
// Add the cofactor visualization first so it appears in the wide view,
// THEN slowly cruise the camera in on it (3 s tween) so the binding
// pocket reveals itself as the surrounding protein slides out of frame.
ms.echo('Step 5 / 5 — Inhibitor HEC: ball-and-stick + transparent surface', {
  size: 24, italic: true,
});
const ligand = pdb.select('HEC');
ligand.bonds.diameter(0.2).color({ model: 'element' });
ligand.atoms.radius({ value: 0.25 }).color({ model: 'element' });
ligand.surface.color({ color: 'magenta', alpha: 0.3 });
ligand.zoom(0.6, { seconds: 3 });
ms.spin('y');
`;

const DISPLAY_HELIX = `// Alpha helix walkthrough on chain A, residues 6-21.
// Demonstrates the new keyword selectors (helix, backbone, sidechain), the
// hbonds channel (yellow dashed lines by default), and the cinematic
// \`zoom(factor, { seconds })\` tween — the rest of the protein ghosts out
// while the camera slowly cruises in on the helix.
const ms = new MolStar();
const pdb = ms.loadPDB(text);
ms.echo('Alpha Helix: residues 6-21, chain A', { size: 24, italic: true });

// Take full control of the canvas: hide Mol*'s default polymer/water/ligand
// representations so only what we add below is visible.
ms.hideDefaults();

// 1. Whole protein as a structure-coloured ribbon, rotate once for context.
pdb.all.ribbon.color({ model: 'structure', alpha: 0.7 });
ms.rotate({ degrees: 360 });

// 2. Spotlight the target helix: paint it as an opaque magenta cartoon on
//    top, then ghost out the rest of the protein (alpha 0.05). The overlay
//    appears bright against a near-invisible backdrop without abrupt cuts.
const helix = pdb.select('6-21:A');
helix.ribbon.color({ color: 'magenta', alpha: 1 });
pdb.all.ribbon.color({ model: 'structure', alpha: 0.05 });

// 3. Slow cinematic zoom into the helix (2.5 s tween) — the ghost backdrop
//    slides naturally out of frame as we move in, completing the
//    "everything fades but the helix" effect. \`hide()\` afterwards drops
//    the now-invisible ghost completely.
helix.zoom(0.85, { seconds: 2.5 });
pdb.all.ribbon.hide();

// 4. Show the helix backbone atoms + bonds.
const backbone = helix.select('backbone');
backbone.atoms.radius({ value: 0.3 });
backbone.atoms.color({ model: 'element' });
backbone.bonds.diameter(0.15);

// 5. Hydrogen bonds — defaults to yellow dashed cylinders. We run
//    detection on the backbone selection so only backbone donors and
//    acceptors are considered; side-chain N/O atoms aren't drawn here,
//    so they shouldn't anchor any cylinders either.
backbone.hbonds.show();

// 6. Slow rotation so the i,i+4 H-bond pattern is easy to follow.
ms.rotate({ degrees: 360, speed: 45 });

// 7. Side chains: just the bond cylinders. We include the .CA atom so
//    the CA-CB bond is in-selection and the sidechain stays anchored to
//    the backbone (otherwise each sidechain renders as a floating stub).
helix.select('sidechain or .CA').bonds.diameter(0.15);
`;

const DISPLAY_SHEET = `// β-sheet walkthrough: two consecutive antiparallel strands on chain A
// (residues 40-47 and 50-57 — strands 1 and 2 of the 3-stranded sheet in
// 8ZXR's SSR1698 domain). Mirrors the helix scene so the two
// secondary-structure motifs read the same way; picking adjacent strands
// is what makes the inter-strand H-bond pattern visible.
const ms = new MolStar();
const pdb = ms.loadPDB(text);
ms.echo('β-sheet: 40-47 + 50-57, chain A', { size: 24, italic: true });

// Take full control of the canvas: hide Mol*'s default polymer/water/ligand
// representations so only what we add below is visible.
ms.hideDefaults();

// 1. Whole protein as a structure-coloured ribbon, rotate once for context.
pdb.all.ribbon.color({ model: 'structure', alpha: 0.7 });
ms.rotate({ degrees: 360 });

// 2. Spotlight the two β-strands: paint them as an opaque lime cartoon on
//    top, then ghost out the rest of the protein (alpha 0.05). The bright
//    strands sit against a near-invisible backdrop without abrupt cuts.
const sheet = pdb.select('40-47:A or 50-57:A');
sheet.ribbon.color({ color: 'limegreen', alpha: 1 });
pdb.all.ribbon.color({ model: 'structure', alpha: 0.05 });

// 3. Slow cinematic zoom into the strands (2.5 s tween) — the ghost
//    backdrop slides out of frame as we move in, completing the
//    "everything fades but the sheet" effect. \`hide()\` afterwards drops
//    the now-invisible ghost completely.
sheet.zoom(0.75, { seconds: 2.5 });
pdb.all.ribbon.hide();

// 4. Show the strand backbone atoms + bonds.
const backbone = sheet.select('backbone');
backbone.atoms.radius({ value: 0.3 }).color({ model: 'element' });
backbone.bonds.diameter(0.15);

// 5. Inter-strand H-bonds — Mol*'s chemistry-aware detector run on the
//    backbone-only sub-structure, so only N…O pairs anchored on drawn
//    atoms get cylinders.
backbone.hbonds.show();

// 6. Slow rotation so the parallel donor/acceptor pattern is easy to see.
ms.rotate({ degrees: 360, speed: 45 });

// 7. Side-chain bonds — include the .CA atom so the CA-CB bond stays
//    in-selection (otherwise the side chain renders as a floating stub).
sheet.select('sidechain or .CA').bonds.diameter(0.15);
`;

const RAMACHANDRAN = `// Five-step Ramachandran tour:
//   1. show the protein cartoon for context
//   2. swap to a synthetic Cα-only model where each Cα sits at (φ, ψ, ω);
//      the chain ID of each Cα encodes its (φ, ψ) region — :H α-helix,
//      :S β-sheet, :C coil — so we colour by chain to colour by SS
//   3. rotate 90° about y to bring the ω axis face-on (cis vs trans)
//   4. rotate -90° about y back to the canonical (φ, ψ) face
//   5. switch back to the protein
const ms = new MolStar();
const pdb = ms.loadPDB(text);
const stats = pdb.dihedralStats();

// Step 1 — protein cartoon.
pdb.all.ribbon.color({ model: 'structure' });
ms.echo(
  '1/5 · Protein cartoon · ' + stats.total + ' residues with full (φ,ψ,ω)',
  { size: 20, italic: true },
);
delay(2);

// Step 2 — switch to the 'rama' model. The synthetic PDB is loaded into
// Mol* but empty of representations; what we paint below is all you see.
// Coordinates are scaled (1° = 0.1 Å) so the cloud fits a normal protein
// bounding box. The 'orthographic' camera removes perspective scaling so
// the dihedral cube reads as a flat scatter plot regardless of depth.
pdb.createModel('rama', {
  pdb: pdb.ramachandranPdb(),
  camera: 'orthographic',
});

pdb.select(':H').atoms.radius({ value: 0.45 }).color({ value: 'crimson' });
pdb.select(':S').atoms.radius({ value: 0.45 }).color({ value: 'goldenrod' });
pdb.select(':C').atoms.radius({ value: 0.35 }).color({ value: 'lightgray' });

// Full-length axes drawn as Mol*-shape arrows — shaft cylinder + cone tip.
// World axes match the synthetic PDB: φ = +X, ψ = +Y (Mol* is Y-up, so
// +ψ ends up at the top of the canvas — literature Ramachandran), ω = +Z
// (perpendicular to the canonical face, projects to the centre under
// orthographic projection).
const arrowOpts = { radius: 0.2, headLength: 2, headRadius: 1 };
ms.arrow([-18, 0, 0], [18, 0, 0], { ...arrowOpts, color: 'red' });
ms.arrow([0, -18, 0], [0, 18, 0], { ...arrowOpts, color: 'green' });
ms.arrow([0, 0, -18], [0, 0, 18], { ...arrowOpts, color: 'blue' });

// Axis labels — free-floating Greek letters drawn at each +tip via the
// ms.text helper (Mol* Text-geometry shape). Mol-star's residue-anchored
// label rep would render the resName + resNum, which is not what we want.
const labelOpts = { size: 4, bold: true };
ms.text([20, 0, 0], 'φ', { ...labelOpts, color: 'red' });
ms.text([0, 20, 0], 'ψ', { ...labelOpts, color: 'green' });
ms.text([0, 0, 20], 'ω', { ...labelOpts, color: 'blue' });

pdb.all.focus();
ms.echo(
  '2/5 · Ramachandran (φ × ψ) · α ' +
    stats.helix +
    ' · β ' +
    stats.sheet +
    ' · coil ' +
    stats.coil,
  { size: 20, italic: true },
);
delay(2);

// Step 3 — rotate -90° about y so the ω axis comes to the front (cis vs
// trans separates into two sheets).
ms.echo(
  '3/5 · Rotate −90° about y → ω axis · cis bonds: ' +
    stats.cis +
    ' / trans: ' +
    stats.trans,
  { size: 20, italic: true },
);
ms.rotate({ axis: 'y', degrees: -90, speed: 45 });

// Step 4 — rotate +90° back to the canonical (φ, ψ) face.
ms.echo('4/5 · Rotate +90° about y · back to (φ × ψ) face', {
  size: 20,
  italic: true,
});
ms.rotate({ axis: 'y', degrees: 90, speed: 45 });

// Step 5 — restore the original protein view, then zoom slowly onto
// GLY 59 (chain A) plus its two neighbours. Glycine has no side-chain
// β-carbon, so its φ angle is free to wander outside the canonical
// L-amino-acid region of the Ramachandran plot — and GLY 59 sits right
// at the end of a β-strand in 8ZXR's SSR1698 domain, which is exactly
// where you'd expect that conformational freedom to show up. We fade
// the cartoon to near-transparent first so the camera tween reveals the
// three-residue ball-and-stick motif against a ghosted backbone.
pdb.switchModel('initial');
ms.fit();
ms.echo('5/5 · Back to the protein — focusing on GLY 59 (chain A)', {
  size: 22, italic: true,
});

// Fade the SS cartoon down to alpha 0.1 so it stays as a faint context
// layer instead of competing visually with the close-up.
pdb.all.ribbon.color({ color: { model: 'structure' }, alpha: 0.1 });

// Reveal GLY 59 + its two flanking residues (58–60) as ball-and-stick,
// element-coloured, so the φ angle around the GLY 59 backbone N–Cα bond
// reads at a glance.
const glyContext = pdb.select('58-60:A');
glyContext.bonds.diameter(0.15).color({ model: 'element' });
glyContext.atoms.radius({ value: 0.3 }).color({ model: 'element' });
glyContext.select('.CA').label('\${residue.name}\${residue.number}', {
  size: 1.4, bold: true,
});

// Smooth 3-second cruise from the wide protein view down onto the
// glycine — the ghosted ribbon slides out of frame as we approach.
glyContext.zoom(0.65, { seconds: 3 });
`;

const INTERACTION = `// HEC binding-site walkthrough: faded protein cartoon for context,
// HEC as clean ball-and-stick (element colors, small spheres), every
// residue with at least one atom within 3.5 Å of HEC revealed with its
// sidechain plus a SHORT orange line between the closest HEC ↔ residue
// atom pair (so the labelled distance is the actual close contact, not
// a misleading centroid-to-CA shortcut). Ends with Mol*'s chemistry-
// aware H-bond detector layered on top as yellow dashed cylinders.
const ms = new MolStar();
const pdb = ms.loadPDB(text);
ms.echo('HEC binding site — residues within 3.5 Å', {
  size: 22,
  italic: true,
});

ms.hideDefaults();

// 1. Faded protein cartoon for context, HEC as small-radius ball-and-
//    stick. The bonds channel automatically adds element-coloured spheres
//    at atom endpoints, so we don't need a separate spacefill rep — that
//    one made the heme look like a fat orange blob.
pdb.all.ribbon.color({ color: { model: 'structure' }, alpha: 0.25 });
const ligand = pdb.select('HEC');
ligand.bonds.diameter(0.2).color({ model: 'element' });
ms.rotate({ degrees: 360 });

// 2. Find every non-HEC residue (protein side chains AND coordinated
//    waters) with at least one atom within 3.5 Å of HEC, and for each
//    such residue keep the CLOSEST HEC ↔ residue atom pair so step 4
//    can draw the actual close contact.
const cutoffSq = 3.5 * 3.5;
const ligandAtoms = pdb.atoms.filter((a) => a.resName === 'HEC');
const contactMap = new Map();
for (const atom of pdb.atoms) {
  if (atom.resName === 'HEC') continue;
  for (const p of ligandAtoms) {
    const dx = atom.x - p.x;
    const dy = atom.y - p.y;
    const dz = atom.z - p.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > cutoffSq) continue;
    const key = atom.chainId + ':' + atom.resNum;
    const previous = contactMap.get(key);
    if (!previous || d2 < previous.d2) {
      contactMap.set(key, {
        chainId: atom.chainId,
        resNum: atom.resNum,
        resName: atom.resName,
        residueAtom: atom.name,
        ligandAtom: p.name,
        d2,
      });
    }
  }
}
const contacts = [...contactMap.values()].sort((a, b) =>
  a.chainId === b.chainId ? a.resNum - b.resNum : a.chainId < b.chainId ? -1 : 1,
);

// 3. Smooth cinematic zoom right onto HEC (2.5 s tween). \`factor: 0.9\`
//    fills almost the whole viewport with the cofactor — once contacts
//    start landing in step 4 the camera stays here, no need to zoom
//    again later.
pdb.select('HEC').zoom(0.9, { seconds: 2.5 });
ms.echo(contacts.length + ' contact residues — closest-atom distance to HEC', {
  size: 18,
  italic: true,
});

// 4. Reveal each contact residue one at a time: sidechain ball-and-stick
//    + CA label + a short orange line between the closest HEC atom and
//    the closest residue atom. The line lies inside the 3.5 Å shell so
//    its length matches what the title promises. The camera turns a
//    small step about y between each reveal so a full 360° is spread
//    across the contacts — atoms come into view as the binding pocket
//    rotates.
const revealStep = 360 / Math.max(contacts.length, 1);
for (const r of contacts) {
  const sel = pdb.select(r.resNum + ':' + r.chainId);
  if (r.resName === 'HOH') {
    // Water: no sidechain / no CA — show the O atom as a red sphere
    //        and anchor the label on it.
    sel.atoms.radius({ value: 0.45 }).color({ model: 'element' });
    sel.select('.' + r.residueAtom).label('\${residue.name}\${residue.number}', {
      size: 1.1,
      bold: true,
    });
  } else {
    sel.select('sidechain or .CA').bonds.diameter(0.15).color({ model: 'element' });
    sel.select('.CA').label('\${residue.name}\${residue.number}', {
      size: 1.3,
      bold: true,
    });
  }
  const residueAtomSel = sel.select('.' + r.residueAtom);
  const ligandAtomSel = pdb.select('HEC').select('.' + r.ligandAtom);
  residueAtomSel.distances.to(ligandAtomSel, {
    color: 'orange',
    diameter: 0.05,
  });
  ms.rotate({ axis: 'y', degrees: revealStep, speed: 45 });
}

// 5. Chemistry-aware H-bond cylinders (yellow dashed) overlaid on the
//    short orange distance labels for any HEC ↔ environment pair Mol*'s
//    contact detector flags as a hydrogen bond. The partner is anything
//    in the structure that is NOT HEC itself — protein side chains AND
//    crystallographic waters — so coordinating H₂O molecules also draw
//    cylinders. No distance pre-filter: Mol*'s own heavy-atom-distance
//    threshold (3.5 Å) is enough.
const environment = pdb.select('not HEC');
ligand.contactsWith(environment, {
  kinds: ['hydrogen-bond'],
  diameter: 0.12,
});

ms.echo('HEC — H-bonds (yellow dashed) + closest-atom orange distances', {
  size: 18,
  italic: true,
});

// 6. Stay zoomed-in and slowly turn so the viewer can read every contact
//    from each angle and appreciate how the cofactor is held in place.
ms.echo('Turning around HEC to see the cofactor stability', {
  size: 18,
  italic: true,
});
ms.rotate({ axis: 'y', degrees: 360, speed: 30 });
`;

const MODELS = `// Demonstrate the model API. 'pdb' is one handle that follows the active
// model; createModel allocates a new model (same PDB by default, fresh op
// log) and activates it. Channel calls record into the active model, so
// switching between models tears down representations and replays the
// target's recorded ops.
const ms = new MolStar();
const pdb = ms.loadPDB(text);

// 'initial' model: structure-coloured ribbon + ligands as spheres.
pdb.all.ribbon.color({ model: 'structure' });
pdb.select('hetero and not water').atoms.color({ model: 'element' });
ms.echo("Active model: 'initial' — structure colouring", {
  size: 22,
  italic: true,
});
delay(3);

// 'rainbow' model — same PDB, fresh op log. We re-paint everything we
// want visible (each model is its own visual scene).
pdb.createModel('rainbow');
pdb.all.ribbon.color({ model: 'sequence' });
pdb.select('hetero and not water').atoms.color({ model: 'element' });
ms.echo("Active model: 'rainbow' — N→C terminus gradient", {
  size: 22,
  italic: true,
});
delay(3);

// Switch back. Mol* keeps the same loaded structure (same PDB), but the
// rep tree is rebuilt from 'initial'.ops — ribbon back to structure
// colouring; the rainbow recolour is gone.
pdb.switchModel('initial');
ms.echo("Switched back: 'initial' restored", { size: 22, italic: true });
`;

/**
 * The full teaching set. Every scene except `global` is written against
 * {@link DEFAULT_PDB_ID} (it names the HEC cofactor, residues 6-21 and 40-57,
 * GLY 59 …), so this list only makes sense for that entry.
 */
export const SCENES: Scene[] = [
  { id: 'global', label: 'Global view', code: GLOBAL_VIEW },
  { id: 'helix', label: 'Display helix', code: DISPLAY_HELIX },
  { id: 'sheet', label: 'Display β-sheet', code: DISPLAY_SHEET },
  { id: 'ramachandran', label: 'Ramachandran', code: RAMACHANDRAN },
  { id: 'interaction', label: 'Interaction 3.5 Å', code: INTERACTION },
  { id: 'models', label: 'Models', code: MODELS },
];

/** Starting point for any entry other than {@link DEFAULT_PDB_ID}. */
export const SAFE_SCENES: Scene[] = [
  { id: 'global', label: 'Global view', code: SAFE_GLOBAL_VIEW },
];

/**
 * Built-in scenes a protein starts with. {@link DEFAULT_PDB_ID} keeps the
 * full teaching set; every other entry gets the single generic global view,
 * which is written to run on any structure.
 * @param pdbId - Four-character PDB identifier.
 * @returns The scenes to seed that protein with.
 */
export function scenesForProtein(pdbId: string): Scene[] {
  return pdbId.trim().toUpperCase() === DEFAULT_PDB_ID ? SCENES : SAFE_SCENES;
}

/**
 * Code shown in the editor before anything has been loaded for a protein.
 * @param pdbId - Four-character PDB identifier.
 * @returns The first built-in scene's code for that protein.
 */
export function defaultSceneCode(pdbId: string): string {
  return scenesForProtein(pdbId)[0]?.code ?? SAFE_GLOBAL_VIEW;
}
