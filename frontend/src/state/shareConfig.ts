/**
 * What one link to this site can say beyond the entry and the filters it
 * carries.
 *
 * `?embed` drops the chrome so a course page or a slide can frame the tool;
 * `?hide=` switches parts of the page off by name. This module is the only
 * place that knows those names — a component asks `isHidden(key)` and never
 * reads the address itself — and it is also where a link is written back into
 * an address the app changes, so a click inside a framed page stays framed.
 */

import type {
  ShareConfig,
  SharePreset,
  ShareVocabulary,
} from 'react-cheminfo/core';
import { EMBED_PARAM, HIDE_PARAM, parseShareConfig } from 'react-cheminfo/core';

/**
 * The parts of a page an embedder can switch off.
 *
 * Each is named positively — the dialog shows a ticked box for a part that
 * stays visible — and its description says what switching it off does, for the
 * person building the link rather than for the visitor. Hiding a part never
 * disables what it carries: a link that hides the filters still runs the search
 * it asks for, which is how an embedder pins a query a visitor cannot widen.
 */
export const SHARE_VOCABULARY = {
  parts: [
    {
      key: 'filters',
      label: 'Filters',
      description:
        'Hiding it keeps the search the link carries and leaves the visitor with the entries it found.',
    },
    {
      key: 'list',
      label: 'Entry list',
      description:
        'Hiding it opens the first entry the search found, with no way to pick another.',
    },
    {
      key: 'viewer',
      label: '3D structure',
      description:
        'Hiding it removes the viewer and its controls; the tables and the header stay.',
    },
    {
      key: 'annotations',
      label: 'Ligands, helices and sheets',
      description: 'Hiding it removes the panel beside the structure.',
    },
    {
      key: 'pdbHeader',
      label: 'PDB header',
      description:
        'Hiding it removes the archive header printed under the structure.',
    },
    {
      key: 'scripting',
      label: 'Open in Scripting',
      description:
        'Hiding it removes the link that takes the visitor out of the framed page.',
      // Inside somebody else's page this leads away from it.
      hiddenByDefault: true,
    },
  ],
} as const satisfies ShareVocabulary;

/** The parts a link can switch off, as `?hide=` names them. */
export type HideKey = (typeof SHARE_VOCABULARY)['parts'][number]['key'];

/**
 * The links this site is actually handed out as, offered as tabs so building
 * one is a click rather than six boxes.
 */
export const SHARE_PRESETS: readonly SharePreset[] = [
  {
    key: 'explore',
    label: 'Search and browse',
    description:
      'The whole browser — filters, list and entry — inside your page.',
    hidden: ['scripting'],
  },
  {
    key: 'entry',
    label: 'One entry',
    description:
      'The entry this search finds, with its structure and its tables. Nothing to search with.',
    hidden: ['filters', 'list', 'scripting'],
  },
  {
    key: 'figure',
    label: 'Structure only',
    description: 'The structure alone, as a figure on a slide.',
    hidden: ['filters', 'list', 'annotations', 'pdbHeader', 'scripting'],
  },
];

/** The preset the dialog opens on when the page runs no configuration of its own. */
export const DEFAULT_SHARE_PRESET = 'explore';

/**
 * Read the configuration a query string carries.
 * @param search - The query string, with or without its leading `?`.
 * @returns The configuration in force, with every unknown key dropped.
 */
export function readShareConfig(search: string): ShareConfig {
  return parseShareConfig(search, SHARE_VOCABULARY);
}

/**
 * Write the configuration the page is running into an address the app is about
 * to navigate to.
 *
 * The pages rebuild their query string from their own state, so without this
 * the first filter a visitor moves would drop `embed` and `hide` and hand the
 * host page its chrome back.
 *
 * It works on the `URLSearchParams` the pages already build rather than on the
 * string `applyShareConfig` takes, because `URLSearchParams.toString()` writes
 * a space as `+`, which the share helpers read as a literal plus:
 * `methods=X-RAY DIFFRACTION` would come back as a method nothing matches.
 * @param params - The address the app wants. Modified in place.
 * @param current - The address the page is on. Defaults to the open page's.
 * @returns The same parameters, now carrying the configuration.
 */
export function carryShareConfig(
  params: URLSearchParams,
  current?: string,
): URLSearchParams {
  const config = readShareConfig(current ?? globalThis.location?.search ?? '');

  params.delete(EMBED_PARAM);
  params.delete(HIDE_PARAM);
  if (config.embed) params.set(EMBED_PARAM, '1');
  if (config.hidden.length > 0) {
    params.set(HIDE_PARAM, config.hidden.join(','));
  }
  return params;
}
