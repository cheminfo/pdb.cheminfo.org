import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures.ts';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockApi(page);
});

/**
 * The value a cell hands over when it is clicked.
 * @param page - Page under test.
 * @param target - The click-to-copy element.
 * @returns What landed on the clipboard.
 */
async function copyFrom(page: Page, target: Locator): Promise<string> {
  await target.click();
  await expect(target).toHaveAttribute('data-copy', 'copied');
  return page.evaluate(() => navigator.clipboard.readText());
}

/**
 * The computed `user-select` of an element.
 * @param target - The element to measure.
 * @returns The computed value.
 */
function userSelectOf(target: Locator): Promise<string> {
  return target.evaluate((node) => getComputedStyle(node).userSelect);
}

test('the tool text is not selectable', async ({ page }) => {
  await page.goto('/browse');
  await page.locator('.pdb-table tbody tr').nth(1).click();

  const meta = page.locator('.browse-entry-meta');
  await expect(meta).toContainText('Residues:');
  expect(await userSelectOf(meta)).toBe('none');

  await meta.getByText('Residues:').dblclick();
  const selected = await page.evaluate(
    () => window.getSelection()?.toString() ?? '',
  );
  expect(selected).toBe('');
});

test('the selected entry copies its PDB code and its title', async ({
  page,
}) => {
  await page.goto('/browse');
  await page.locator('.pdb-table tbody tr').nth(1).click();

  const code = page.locator('.browse-entry-id');
  await expect(code).toHaveAttribute('title', 'Copy the PDB code (3QK2)');
  expect(await code.evaluate((node) => getComputedStyle(node).cursor)).toBe(
    'copy',
  );

  expect(await copyFrom(page, code)).toBe('3QK2');
  await expect(code.locator('.click-to-copy__status')).toHaveText('Copied');

  expect(await copyFrom(page, page.locator('.browse-entry-title'))).toBe(
    'Another lactamase structure',
  );
});

test('the ligand cells copy the code, the formula, the name and the SMILES', async ({
  page,
}) => {
  await page.goto('/browse');
  await page.locator('.pdb-table tbody tr').nth(1).click();

  const row = page.locator('.browse-side .info-table tbody tr').first();
  expect(await copyFrom(page, row.locator('td.mono'))).toBe('HEM');
  expect(await copyFrom(page, row.locator('td.mf-cell'))).toBe('C34H32FeN4O4');
  expect(await copyFrom(page, row.locator('td.ligand-name'))).toBe('Heme');

  const structure = row.locator('td.ligand-structure-cell');
  await expect(structure).toHaveClass(/click-to-copy/);
  expect(await copyFrom(page, structure)).toBe('c1ccccc1');
});

test('the PDBs panel copies the selected ligand and its PDB ids', async ({
  page,
}) => {
  await page.route(/\/v1\/ligands\/ATP\/pdbs/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: 2,
        limit: 100,
        offset: 0,
        pdbs: [
          { pdbId: '1O8O', count: 1 },
          { pdbId: '3QK2', count: 3 },
        ],
      }),
    }),
  );
  await page.goto('/molecules');
  await page
    .locator('.molecules-results-body tbody tr')
    .filter({ hasText: 'ATP' })
    .click();

  const caption = page.locator('.ligand-pdbs-caption');
  await expect(caption).toBeVisible();
  expect(await copyFrom(page, caption.locator('.ligand-pdbs-code'))).toBe(
    'ATP',
  );
  expect(await copyFrom(page, caption.locator('.click-to-copy').nth(1))).toBe(
    'C10H16N5O13P3',
  );
  expect(await copyFrom(page, caption.locator('.click-to-copy').nth(2))).toBe(
    '507.18',
  );
  expect(await copyFrom(page, caption.locator('.ligand-pdbs-name'))).toBe(
    'ADENOSINE TRIPHOSPHATE',
  );

  await page.getByRole('button', { name: 'Copy IDs' }).click();
  await expect(page.getByRole('button', { name: 'Copy IDs' })).toHaveText(
    'Copied',
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '1O8O\n3QK2',
  );
});

test('the raw PDB file and the API reference stay selectable', async ({
  page,
}) => {
  await page.goto('/browse');
  await page.locator('.pdb-table tbody tr').nth(1).click();

  const raw = page.locator('pre.pdb-header');
  await expect(raw).toContainText('HEADER    SAMPLE STRUCTURE');
  expect(await userSelectOf(raw)).toBe('text');

  await page.goto('/api');
  const path = page.locator('.endpoint code.path').first();
  await expect(path).toBeVisible();
  expect(await userSelectOf(path)).toBe('text');
});

test('the scripting guide stays selectable', async ({ page }) => {
  await page.goto('/scripting');
  await page.getByRole('button', { name: 'Help' }).click();
  const tab = page.locator('.help-tab').first();
  await expect(tab).toBeVisible();
  expect(await userSelectOf(tab)).toBe('text');
});
