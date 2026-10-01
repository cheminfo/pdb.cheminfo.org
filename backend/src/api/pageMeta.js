/**
 * The head, and the crawl path, of the page the server hands out — per route.
 *
 * Googlebot renders JavaScript; Bing, a Slack unfurl, an LMS preview and every
 * academic indexer read the HTML that came off the wire. The built page carries
 * neither of them: it declares where they go with `<!--cheminfo:head-->` and
 * `<!--cheminfo:body-->`, and they are written here for the address being
 * answered. The string work is `react-cheminfo/core`; what is this site's own
 * is the route table it is given, the prose below and the entry pages derived
 * from the address.
 */

import {
  PAGE_BODY_MARKER,
  PAGE_HEAD_MARKER,
  fill,
  noscriptIndex,
  pageHeadTags,
  pageMetaFor as siteMetaFor,
  structuredDataScript,
} from 'react-cheminfo/core';

import { PAGE_ROUTES, SITE_ID } from './routes.js';

/** @typedef {import('react-cheminfo/core').RouteMeta} RouteMeta */

/**
 * @typedef {object} RouteLookup
 * @property {readonly RouteMeta[]} routes The table the address is looked up in.
 * @property {string} url The address to read out of it.
 */

/**
 * What the structured-data block says this tool is. It says more than the line
 * the family menu carries, so it is written here rather than left to the
 * tagline.
 */
const APPLICATION = {
  category: 'ScienceApplication',
  operatingSystem: 'Any',
  description:
    'Open any Protein Data Bank entry by its identifier and see its chains, its ligands and its assemblies at once, from a local mirror kept in step with the archive.',
};

/**
 * The prose the crawl path opens with, and the pages it links: the six the
 * visitor can walk to, the home page being the one they are already on.
 */
const NOSCRIPT = {
  heading: 'pdb.cheminfo.org — a fast look at any Protein Data Bank entry',
  intro:
    'Open any Protein Data Bank entry by its identifier and see its chains, its ligands and its assemblies at once, from a mirror kept in step with the archive. The site itself needs JavaScript; the JSON API does not.',
  ecosystem: { taglines: false },
  routes: PAGE_ROUTES.filter((route) => route.path !== '/'),
};

/**
 * Write the served page's head and crawl path for the route it is answering:
 * the title, the description, the canonical address, the card a link to it
 * unfurls into, what kind of application this is, and the pages a reader with
 * no JavaScript is offered. A crawler that does not run scripts sees the right
 * page rather than the home page's.
 * @param {string} html - The built page, carrying both markers.
 * @param {{ url: string, origin: string }} options - The address asked for and
 * where the site is served from, e.g. `https://pdb.cheminfo.org`.
 * @returns {string} The page, written for that route.
 * @throws {Error} When the page carries neither marker, so a bundle built
 * without them fails loudly instead of being indexed under one title.
 */
export function injectPageMeta(html, options) {
  const { routes, url } = resolve(options.url);
  const { origin } = options;
  const head = `${pageHeadTags({ site: SITE_ID, routes, url, origin })}
${structuredDataScript({ site: SITE_ID, routes, origin, ...APPLICATION })}`;

  // The crawl path carries the text of the address being served, above the menu
  // every address carries. Without it each entry shipped the same body — this
  // menu, byte for byte — and a search engine handed one text for every
  // identifier in the archive clusters them into a single result.
  const meta = siteMetaFor(routes, url);
  return fill(
    fill(html, PAGE_HEAD_MARKER, head),
    PAGE_BODY_MARKER,
    noscriptIndex({
      site: SITE_ID,
      origin,
      ...NOSCRIPT,
      content: { heading: meta.title, paragraphs: [meta.description] },
    }),
  );
}

/**
 * The page an address opens. An address this site does not know opens the home
 * page, as the frontend router does, and is indexed as the home page rather
 * than under its own name.
 * @param {string} url - The address asked for, query string included.
 * @returns {RouteMeta} The title, description and canonical path of that page.
 */
export function pageMetaFor(url) {
  const { routes, url: address } = resolve(url);
  return siteMetaFor(routes, address);
}

/**
 * The table an address is looked up in, and the address it is looked up under.
 *
 * An entry is a page of its own — a structure somebody links to by its id — and
 * there are hundreds of thousands of them, so it is derived for the one address
 * being answered instead of being listed in the table.
 * @param {string} url - The address asked for.
 * @returns {RouteLookup} The table, and the address to read out of it.
 */
function resolve(url) {
  const entry = entryRoute(url);
  return entry === undefined
    ? { routes: PAGE_ROUTES, url }
    : { routes: [...PAGE_ROUTES, entry], url: entry.path };
}

/**
 * The page a single Protein Data Bank entry is indexed as.
 * @param {string} url - The address asked for.
 * @returns {RouteMeta | undefined} Its route, or undefined when the address
 * names no entry.
 */
function entryRoute(url) {
  const cut = url.search(/[?#]/);
  const pathname = cut === -1 ? url : url.slice(0, cut);
  const [, first, second] = pathname.split('/');
  if (first !== 'scripting' || !second) return undefined;

  const pdbId = second.toUpperCase();
  return {
    path: `/scripting/${pdbId}`,
    title: `${pdbId} — the structure, and a script over it`,
    description: `Open Protein Data Bank entry ${pdbId}, look at its chains, ligands and assemblies, and run a script over the structure in the browser.`,
  };
}
