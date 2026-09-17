import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures.ts';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('the header carries Share, next to About, Cite and Tools', async ({
  page,
}) => {
  await page.goto('/browse');
  const actions = page.locator('.app-header-actions');

  await expect(actions.getByRole('button', { name: 'Share' })).toBeVisible();
  await expect(actions.getByRole('button', { name: 'Share' })).toHaveAttribute(
    'title',
    'Share a link to this page, or embed it in your own site',
  );
});

test('the share dialog offers a framed link and the iframe that pastes it', async ({
  page,
}) => {
  await page.goto('/browse?q=lactamase');
  await page
    .locator('.app-header-actions')
    .getByRole('button', {
      name: 'Share',
    })
    .click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Link' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Iframe' })).toBeVisible();

  // The dialog opens on the link people actually hand out: framed, with the
  // way out of the framed page already switched off, and carrying the query
  // the page is running.
  await expect(dialog).toContainText('embed=1');
  await expect(dialog).toContainText('hide=scripting');
  await expect(dialog).toContainText('q=lactamase');
  await expect(dialog).toContainText('<iframe');
});

test('?hide= drops the parts it names and keeps the search they carried', async ({
  page,
}) => {
  await page.goto('/browse?embed=1&hide=filters,list,annotations&q=lactamase');

  await expect(page.locator('.filter-panel')).toHaveCount(0);
  await expect(page.locator('.browse-list-col')).toHaveCount(0);
  await expect(page.locator('.browse-side')).toHaveCount(0);

  // Hidden means hidden, not disabled: the query the link carries still ran,
  // so the one entry it finds is the one on screen.
  await expect(page.locator('.browse-entry-header')).toContainText('3QK2');
  await expect(page.locator('.browse-pdb-text')).toBeVisible();
});

test('?hide=viewer,pdbHeader leaves the entry and its tables', async ({
  page,
}) => {
  await page.goto('/browse?embed=1&hide=viewer,pdbHeader');

  await expect(page.locator('.browse-viewer')).toHaveCount(0);
  await expect(page.locator('.browse-pdb-text')).toHaveCount(0);
  await expect(page.locator('.browse-side')).toBeVisible();
});

test('the configuration survives a filter the visitor changes', async ({
  page,
}) => {
  await page.goto('/browse?embed=1&hide=scripting');
  await expect(page.getByRole('banner')).toHaveCount(0);

  await page.getByPlaceholder('Search titles…').fill('lactamase');
  await expect(page.locator('.pdb-table tbody tr')).toHaveCount(1);

  await expect(page).toHaveURL(/embed=1/);
  await expect(page).toHaveURL(/hide=scripting/);
  await expect(page.getByRole('banner')).toHaveCount(0);
});
