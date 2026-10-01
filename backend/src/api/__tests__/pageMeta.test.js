import { expect, test } from 'vitest';

import { injectPageMeta, pageMetaFor } from '../pageMeta.js';
import { PAGE_ROUTES } from '../routes.js';
import { buildRobots, buildSitemap } from '../sitemap.js';

// The template the build ships: it declares where its head and its crawl path
// go and carries neither of its own.
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<!--cheminfo:head--></head><body><div id="root"></div>
<!--cheminfo:body--></body></html>`;

test('each page is titled and described on its own', () => {
  expect(pageMetaFor('/browse').title).toBe('Browse the Protein Data Bank');
  expect(pageMetaFor('/molecules').title).toBe(
    'The ligands of the Protein Data Bank',
  );
  expect(pageMetaFor('/stats').title).toBe('What the Protein Data Bank holds');
  expect(pageMetaFor('/api').title).toBe('The API — every entry as JSON');
  expect(pageMetaFor('/about').title).toBe('About, and what to cite');
  expect(pageMetaFor('/').title).toBe(
    'A fast look at any Protein Data Bank entry',
  );

  const descriptions = new Set(
    PAGE_ROUTES.map((route) => pageMetaFor(route.path).description),
  );

  expect(descriptions.size).toBe(PAGE_ROUTES.length);
});

test('an entry is a page of its own, named by its identifier', () => {
  const meta = pageMetaFor('/scripting/1crn');

  expect(meta.title).toBe('1CRN — the structure, and a script over it');
  expect(meta.description).toContain('entry 1CRN');
  expect(meta.path).toBe('/scripting/1CRN');
});

test('an address the site does not know is the home page', () => {
  expect(pageMetaFor('/nowhere')).toStrictEqual(pageMetaFor('/'));
});

test('a query string never reaches the canonical address', () => {
  expect(pageMetaFor('/browse?method=X-RAY&page=4').path).toBe('/browse');
  expect(pageMetaFor('/stats/').path).toBe('/stats');
});

test('the served page carries that page, not the build', () => {
  const html = injectPageMeta(PAGE, {
    url: '/browse',
    origin: 'https://pdb.cheminfo.org',
  });

  expect(html).toContain(
    '<title>Browse the Protein Data Bank — pdb.cheminfo.org</title>',
  );
  expect(html.match(/<title>/g)).toHaveLength(1);
  expect(html).toContain(
    '<link rel="canonical" href="https://pdb.cheminfo.org/browse" />',
  );
  expect(html).toContain(
    '<meta property="og:image" content="https://pdb.cheminfo.org/og.png" />',
  );
  expect(html.indexOf('rel="canonical"')).toBeLessThan(html.indexOf('</head>'));
});

/**
 * The words a crawler reads in the page, with the markup taken out.
 * @param {string} html - The page as it was served.
 * @returns {string} Its crawl-path text.
 */
function bodyText(html) {
  return (/<noscript>([\s\S]*?)<\/noscript>/.exec(html)?.[1] ?? '')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

test('each address carries its own text above the index', () => {
  const origin = 'https://pdb.cheminfo.org';
  const browse = injectPageMeta(PAGE, { url: '/browse', origin });
  const about = injectPageMeta(PAGE, { url: '/about', origin });

  // Both carry the menu; what must differ is the text above it, or a search
  // engine is handed one page under every address of the site.
  expect(bodyText(browse)).not.toBe(bodyText(about));
  expect(bodyText(about)).toContain('About, and what to cite');
});

test('the page a crawler reads carries what the site is, and where it goes', () => {
  const html = injectPageMeta(PAGE, {
    url: '/browse',
    origin: 'https://pdb.cheminfo.org',
  });

  expect(html).toContain('"applicationCategory": "ScienceApplication"');
  expect(html).toContain('"name": "pdb.cheminfo.org"');
  // The page's own name heads the block, not the site's: a search engine reads
  // one `h1` per address, and it must be the address it is on.
  expect(html).toContain('<h1>Browse the Protein Data Bank</h1>');
  expect(html).toContain(
    '<li><a href="/browse">Browse</a> — search and filter every entry</li>',
  );
  expect(html).toContain('<a href="https://inchi.cheminfo.org/">');
  expect(html).not.toContain('<li><a href="/">');
  expect(html.indexOf('<noscript>')).toBeGreaterThan(html.indexOf('</head>'));
});

test('the markers are consumed, never served', () => {
  const html = injectPageMeta(PAGE, {
    url: '/',
    origin: 'https://pdb.cheminfo.org',
  });

  expect(html).not.toContain('<!--cheminfo:head-->');
  expect(html).not.toContain('<!--cheminfo:body-->');
  expect(() =>
    injectPageMeta(html, { url: '/', origin: 'https://pdb.cheminfo.org' }),
  ).toThrow('the page carries no <!--cheminfo:head-->');
});

test('the host is never trusted', () => {
  const html = injectPageMeta(PAGE, {
    url: '/',
    origin: 'https://pdb.cheminfo.org/"><script>alert(1)</script>',
  });

  expect(html).not.toContain('<script>alert(1)</script>');
  expect(html).toContain('&quot;&gt;&lt;script&gt;');

  // A host that is not an address at all is refused rather than written out.
  expect(() =>
    injectPageMeta(PAGE, {
      url: '/',
      origin: 'evil"><script>alert(1)</script>',
    }),
  ).toThrow('an origin is an absolute address');
});

test('the sitemap lists every page, and only pages', () => {
  const xml = buildSitemap('https://pdb.cheminfo.org');

  expect(xml).toContain('<loc>https://pdb.cheminfo.org/</loc>');
  expect(xml).toContain('<loc>https://pdb.cheminfo.org/browse</loc>');
  expect(xml.match(/<loc>/g)).toHaveLength(7);

  for (const route of PAGE_ROUTES) {
    expect(pageMetaFor(route.path).path).toBe(route.path);
  }
});

test('the policy keeps the API out of the index and names the sitemap', () => {
  const robots = buildRobots('https://pdb.cheminfo.org');

  expect(robots).toContain('Disallow: /v1/');
  expect(robots).toContain('Disallow: /stats/');
  expect(robots).not.toContain('Disallow: /stats\n');
  expect(robots).toContain('Sitemap: https://pdb.cheminfo.org/sitemap.xml');
});
