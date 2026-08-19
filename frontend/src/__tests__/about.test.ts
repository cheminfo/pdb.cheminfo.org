import { aboutProblems, resolveAbout } from 'react-cheminfo/core';
import { expect, test } from 'vitest';

import { ABOUT } from '../about.ts';

test('the About record says what the house style asks of it', () => {
  expect(aboutProblems(ABOUT)).toStrictEqual([]);
});

test('the About names the site, its six pages and its two paragraphs', () => {
  expect(ABOUT.siteId).toBe('pdb');
  expect(ABOUT.what).toBe(
    'A read-only mirror of the worldwide Protein Data Bank, served with a search index, an HTTP API and pre-rendered views.',
  );
  expect(ABOUT.can).toHaveLength(6);
  expect(ABOUT.can[0]).toBe(
    'Open any entry by its identifier and read its chains, ligands and assemblies.',
  );
  expect(ABOUT.paragraphs).toHaveLength(2);
});

test('the About credits every borrowed work the site runs on', () => {
  expect(ABOUT.credits).toStrictEqual([
    'molstar',
    'openchemlib',
    'react-ocl',
    'react-mf',
    'nivo',
    'blueprint',
    'react-science',
    'react-cheminfo',
    'react',
    'vite',
  ]);
  expect(
    resolveAbout(ABOUT).credits.map((credit) => credit.license),
  ).toStrictEqual([
    'MIT',
    'BSD-3-Clause',
    'MIT',
    'MIT',
    'MIT',
    'Apache-2.0',
    'MIT',
    'MIT',
    'MIT',
    'MIT',
  ]);
});

test('the About asks for the three wwPDB references and the Mol* paper', () => {
  expect(ABOUT.cite?.map((work) => work.reference.doi)).toStrictEqual([
    '10.1093/nar/gky949',
    '10.1038/nsb1203-980',
    '10.1093/nar/28.1.235',
    '10.1093/nar/gkab314',
  ]);
});
