/**
 * Drawing a query in the Molecules editor, the way a visitor does: one click
 * with the default Single-bond tool on empty paper draws an ethane, and the
 * ligand search runs a substructure query for it.
 *
 * The editor lives in an open shadow root that locators do not pierce, so the
 * canvases are measured through `evaluate` on the editor's host element.
 */

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures.ts';

/** The idCode of ethane, what one Single-bond click on empty paper draws. */
const ETHANE_ID_CODE = 'eF@Hp@';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('a bond drawn in the editor runs a substructure search for it', async ({
  page,
}) => {
  const queries = recordLigandQueries(page);
  await page.goto('/molecules');
  await expect(
    page.getByRole('heading', { name: 'Most-referenced ligands' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Clear query' }),
  ).toBeDisabled();

  const { drawing } = await editorBoxes(page);
  // Bottom-left of the paper: the help button holds the top-right corner.
  await page.mouse.click(drawing.x + 60, drawing.y + drawing.height - 60);

  // The idCode carries the drawn coordinates after a space.
  await expect
    .poll(() => queries.at(-1)?.substructure?.split(' ')[0])
    .toBe(ETHANE_ID_CODE);
  expect(queries.at(-1)?.mode).toBe('substructure');
  await expect(
    page.getByRole('heading', { name: 'Substructure matches' }),
  ).toBeVisible();
  await expect(page.locator('.molecules-status')).toHaveText(
    '2 matches · 2 screened in 2 ms',
  );
  await expect(page.getByRole('button', { name: 'Clear query' })).toBeEnabled();
});

test('Clear drops an edit still waiting and empties the canvas', async ({
  page,
}) => {
  const queries = recordLigandQueries(page);
  await page.goto('/molecules');
  const clear = page.getByRole('button', { name: 'Clear query' });
  const { drawing } = await editorBoxes(page);
  const bottomLeft = { x: drawing.x + 60, y: drawing.y + drawing.height - 60 };

  await page.mouse.click(bottomLeft.x, bottomLeft.y);
  await expect(clear).toBeEnabled();

  // A second bond, then Clear before the editor's 300 ms debounce reports it.
  await page.mouse.click(drawing.x + 60, drawing.y + 60);
  await clear.click();
  // An absence cannot be polled: leave the dropped edit time to land.
  await page.waitForTimeout(1000);

  await expect(
    page.getByRole('heading', { name: 'Most-referenced ligands' }),
  ).toBeVisible();
  expect(queries.at(-1)?.substructure).toBeNull();
  await expect(clear).toBeDisabled();
  await expect(page.locator('.molecules-searching-badge')).toHaveCount(0);

  // On an emptied canvas the same click draws ethane alone again.
  await editorBoxes(page);
  await page.mouse.click(bottomLeft.x, bottomLeft.y);
  await expect
    .poll(() => queries.at(-1)?.substructure?.split(' ')[0])
    .toBe(ETHANE_ID_CODE);
});

test('the editor names its toolbar buttons and explains its keys', async ({
  page,
}) => {
  await page.goto('/molecules');
  const { toolbar } = await editorBoxes(page);

  // Two columns of 21 px buttons inside a 2 px border; row 5 of the left
  // column is Single bond.
  await page.mouse.move(toolbar.x + 12, toolbar.y + 2 + 5 * 21 + 10);
  await expect(page.getByTestId('structure-editor-tooltip')).toContainText(
    'Single bond',
  );

  await page
    .locator('.molecules-editor-canvas')
    .getByRole('button', { name: 'Mouse and keyboard' })
    .click();
  await expect(page.getByTestId('structure-editor-help')).toBeVisible();
});

/**
 * Keep the parameters of every ligand search the page sends.
 * @param page - The page under test.
 * @returns The `substructure` and `mode` of each search, oldest first.
 */
function recordLigandQueries(
  page: Page,
): Array<{ substructure: string | null; mode: string | null }> {
  const queries: Array<{ substructure: string | null; mode: string | null }> =
    [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname !== '/v1/ligands') return;
    queries.push({
      substructure: url.searchParams.get('substructure'),
      mode: url.searchParams.get('mode'),
    });
  });
  return queries;
}

/**
 * Where the editor's toolbar and drawing canvases sit on the page, once both
 * have been laid out.
 * @param page - The page holding the Molecules editor.
 * @returns The two bounding boxes, in page coordinates.
 */
async function editorBoxes(
  page: Page,
): Promise<{ toolbar: Box; drawing: Box }> {
  const editor = page.locator(
    '.molecules-editor-canvas [data-openchemlib-canvas-editor]',
  );
  await expect(editor).toHaveCount(1);
  const measure = () =>
    editor.evaluate((host) => {
      const root = host.shadowRoot;
      const toolbar = root?.firstElementChild;
      const drawing = root?.querySelector('canvas[tabindex]');
      if (!toolbar || !drawing) return null;
      const box = (element: Element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      };
      return { toolbar: box(toolbar), drawing: box(drawing) };
    });
  await expect
    .poll(async () => {
      const boxes = await measure();
      return Boolean(boxes && boxes.drawing.height > 0);
    })
    .toBe(true);
  const boxes = await measure();
  if (!boxes) throw new Error('editor canvases not found');
  return boxes;
}
