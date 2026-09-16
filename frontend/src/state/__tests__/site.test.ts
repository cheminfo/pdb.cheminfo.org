import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

/**
 * The site as a deployment stamped it, loaded fresh so its mount is read again.
 * @param baseUri - What `document.baseURI` reads on the page handed out.
 * @returns The module, bound to that mount.
 */
async function siteMountedAt(baseUri: string) {
  vi.stubGlobal('document', { baseURI: baseUri });
  vi.resetModules();
  return import('../site.ts');
}

test('a deployment on a host of its own writes its addresses unchanged', async () => {
  const site = await siteMountedAt('https://pdb.cheminfo.org/');

  expect(site.BASE_PATH).toBe('');
  expect(site.withBase('/')).toBe('/');
  expect(site.withBase('/ligands')).toBe('/ligands');
  expect(site.pathWithoutBase('/ligands')).toBe('/ligands');
});

test('a deployment mounted under a path writes every address under it', async () => {
  const site = await siteMountedAt('https://eln.epfl.ch/cheminfo/pdb/');

  expect(site.BASE_PATH).toBe('/cheminfo/pdb');
  expect(site.withBase('/')).toBe('/cheminfo/pdb/');
  expect(site.withBase('/ligands')).toBe('/cheminfo/pdb/ligands');
  expect(site.pathWithoutBase('/cheminfo/pdb/ligands')).toBe('/ligands');
  expect(site.pathWithoutBase('/cheminfo/pdb')).toBe('/');
});

test('the same build serves both addresses, because the mount is not built in', async () => {
  const own = await siteMountedAt('https://pdb.cheminfo.org/');
  const shared = await siteMountedAt('https://eln.epfl.ch/cheminfo/pdb/');

  expect(own.withBase('/about')).toBe('/about');
  expect(shared.withBase('/about')).toBe('/cheminfo/pdb/about');
});

test('a page of another tool on the shared host is not read as one of ours', async () => {
  const site = await siteMountedAt('https://eln.epfl.ch/cheminfo/pdb/');

  expect(site.pathWithoutBase('/cheminfo/surge/exercises')).toBe(
    '/cheminfo/surge/exercises',
  );
  expect(site.pathWithoutBase('/cheminfo/pdbx')).toBe('/cheminfo/pdbx');
});
