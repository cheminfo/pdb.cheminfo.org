import type { ShareConfig } from 'react-cheminfo/core';
import {
  applyShareConfig,
  applySharePreset,
  buildEmbedCode,
} from 'react-cheminfo/core';
import { expect, test } from 'vitest';

import {
  DEFAULT_SHARE_PRESET,
  SHARE_PRESETS,
  SHARE_VOCABULARY,
  carryShareConfig,
  readShareConfig,
} from '../shareConfig.ts';

test('a plain address configures nothing', () => {
  expect(readShareConfig('?q=cocaine')).toStrictEqual({
    embed: false,
    hidden: [],
    params: {},
  });
});

test('a link frames the page and switches parts off by name', () => {
  expect(readShareConfig('?embed=1&hide=filters,list&q=cocaine')).toStrictEqual(
    {
      embed: true,
      hidden: ['filters', 'list'],
      params: {},
    },
  );
});

test('?embed alone frames the page, as a retyped link writes it', () => {
  expect(readShareConfig('?embed').embed).toBe(true);
  expect(readShareConfig('?embed=0').embed).toBe(false);
});

test('a part this site does not have is ignored rather than thrown on', () => {
  expect(readShareConfig('?hide=substructure,viewer').hidden).toStrictEqual([
    'viewer',
  ]);
});

test('the parts come back in the vocabulary order, whatever the link says', () => {
  expect(
    readShareConfig('?hide=pdbHeader,filters,viewer').hidden,
  ).toStrictEqual(['filters', 'viewer', 'pdbHeader']);
});

test('a rebuilt address keeps the configuration and the tool inputs', () => {
  const next = carryShareConfig(
    new URLSearchParams({ q: 'cocaine', order: 'year' }),
    '?embed=1&hide=filters,list',
  );

  expect(Object.fromEntries(next)).toStrictEqual({
    q: 'cocaine',
    order: 'year',
    embed: '1',
    hide: 'filters,list',
  });
});

test('an unconfigured page leaves the address it rebuilt alone', () => {
  const next = carryShareConfig(
    new URLSearchParams({ q: 'cocaine' }),
    '?q=heme',
  );

  expect(next.toString()).toBe('q=cocaine');
});

test('a value with a space survives being carried', () => {
  const next = carryShareConfig(
    new URLSearchParams({ methods: 'X-RAY DIFFRACTION' }),
    '?embed=1',
  );

  expect(new URLSearchParams(next.toString()).get('methods')).toBe(
    'X-RAY DIFFRACTION',
  );
});

test('a stale configuration is replaced, never doubled', () => {
  const next = carryShareConfig(
    new URLSearchParams({ embed: '1', hide: 'viewer' }),
    '?q=heme',
  );

  expect(next.toString()).toBe('');
});

test('the presets are the three links this site is handed out as', () => {
  expect(SHARE_PRESETS.map((preset) => preset.key)).toStrictEqual([
    'explore',
    'entry',
    'figure',
  ]);

  expect(DEFAULT_SHARE_PRESET).toBe('explore');
});

test('each preset frames the page and switches its own parts off', () => {
  const plain: ShareConfig = { embed: false, hidden: [], params: {} };
  const links = SHARE_PRESETS.map((preset) =>
    applyShareConfig(
      '',
      applySharePreset(plain, preset, SHARE_VOCABULARY),
      SHARE_VOCABULARY,
    ),
  );

  expect(links).toStrictEqual([
    'embed=1&hide=scripting',
    'embed=1&hide=filters,list,scripting',
    'embed=1&hide=filters,list,annotations,pdbHeader,scripting',
  ]);
});

test('the iframe snippet a course pastes is framable and named', () => {
  expect(
    buildEmbedCode({
      url: 'https://pdb.cheminfo.org/browse?embed=1&hide=filters',
      title: 'Browse — pdb.cheminfo.org',
    }),
  ).toContain('src="https://pdb.cheminfo.org/browse?embed=1&amp;hide=filters"');
});
