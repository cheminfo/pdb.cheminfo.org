import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { siteById } from 'react-cheminfo/core';

import { PAGE_ROUTES } from '../../backend/src/api/routes.js';
import { ABOUT } from '../src/about.ts';

// These specs run against the backend the webServer starts, seeded from the
// committed fixtures, rather than against mocked responses.

/** Addresses main.tsx routes that the indexed PAGE_ROUTES table leaves out. */
const UNINDEXED_ROUTES = ['/scripting/1CRN', '/settings'];

const ROUTED_ADDRESSES = [
  ...PAGE_ROUTES.map((route) => route.path),
  ...UNINDEXED_ROUTES,
];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console.error: ${message.text()}`);
    }
  });
  return errors;
}

/**
 * Click the 2015 X-ray bar of "Methods over time" on the home page and check
 * that Browse opens filtered to exactly the two 2015 X-ray fixture entries.
 * @param page - Playwright page, already on the home page.
 */
async function browseFromMethodsChart(page: Page) {
  await page.getByTestId('bar.item.X-ray.0').click();

  const rows = page.locator('.pdb-table tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows).toContainText(['4YYR', '5ABY']);
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toStrictEqual({
    methods: 'X-RAY DIFFRACTION',
    yearMax: '2015',
    yearMin: '2015',
  });
}

test.beforeEach(async ({ page }) => {
  // One year keeps the chart to one clickable bar; the value is what the
  // fixture backend reports for 2015.
  await page.route(/\/v1\/stats\/methodByYear/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        rows: [{ key: [2015, 'X-RAY DIFFRACTION'], value: 2 }],
      }),
    }),
  );
});

test('the home page counts the fixture entries and its chart opens Browse', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'PDB entries' })
      .locator('.value'),
  ).toHaveText('21');

  await browseFromMethodsChart(page);
});

test('/about renders the About page with the Cite control and the footer', async ({
  page,
}) => {
  const { name } = siteById('pdb');
  await page.goto('/about');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    `${name.lead}${name.dot ? '.' : ''}${name.alt}`,
  );
  await expect(page.getByText(ABOUT.what, { exact: true })).toBeVisible();
  await expect(page.locator('.about-can li')).toHaveText(ABOUT.can);
  await expect(
    page.getByRole('heading', { name: 'The wwPDB partners', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'How to cite', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'Cite', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

for (const query of ['?embed', '?embed=1']) {
  test(`${query} drops the header and the footer and keeps the tool`, async ({
    page,
  }) => {
    await page.goto(`/${query}`);

    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);

    await browseFromMethodsChart(page);
  });
}

for (const address of ROUTED_ADDRESSES) {
  test(`${address} loads with no page error and no console error`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto(address);
    await expect(page.getByRole('main')).toBeVisible();
    await page.waitForLoadState('networkidle');

    expect(errors).toStrictEqual([]);
  });
}

test('an unknown path falls back to the home page', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/no-such-page');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'A fast look at any Protein Data Bank entry',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Statistics', exact: true }),
  ).toBeVisible();
  expect(errors).toStrictEqual([]);
});
