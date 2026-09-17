import { carryShareConfig } from '../../state/shareConfig.ts';

/**
 * Build a deep-link URL into the `/browse` page with the given filter
 * parameters. Empty / null / undefined values are dropped so the resulting
 * URL stays compact. Keys match the GET /v1/pdbs query parameters (which is
 * also what `BrowsePage` reads via `filterStateFromUrl`).
 *
 * The configuration the open page runs travels with the link, so a chart
 * clicked inside a framed page opens the browser framed as well.
 * @param params - Filter parameters to encode (e.g. `{ year: 2024, methods: 'X-RAY DIFFRACTION' }`).
 * @returns The href string, prefixed with `/browse?`.
 */
export function browseHref(
  params: Record<string, string | number | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const stringValue = String(value);
    if (stringValue === '') continue;
    search.set(key, stringValue);
  }
  const query = carryShareConfig(search).toString();
  return query ? `/browse?${query}` : '/browse';
}
