/** Top-level app pages — pathname segment before the hash. */
export type AppPage =
  'home' | 'mobile' | 'vim' | 'dojo' | 'games' | 'workspace' | 'plans' | 'resumes';

const PAGE_SEGMENTS: Readonly<Record<AppPage, string>> = {
  home: 'home',
  mobile: 'mobile',
  vim: 'vim',
  dojo: 'dojo',
  games: 'games',
  workspace: 'workspace',
  plans: 'plans',
  resumes: 'resumes',
};

/** Vite base path without trailing slash, e.g. "" or "/algo-moves". */
export function getAppBasePath(): string {
  const base = (import.meta.env.BASE_URL || '/').trim() || '/';
  if (base === '/') return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** Canonical pathname for a page, e.g. "/mobile" or "/algo-moves/home". */
export function pagePath(page: AppPage): string {
  return `${getAppBasePath()}/${PAGE_SEGMENTS[page]}`;
}

/** Hash body without the leading `#`. */
export function getHashBody(hash: string): string {
  if (!hash || hash === '#') return '';
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  return body.trim();
}

/** Parse the page segment from a pathname; null at app root or unknown paths. */
export function parsePageFromPathname(pathname: string): AppPage | null {
  const base = getAppBasePath();
  let rest = pathname.trim();
  if (base && rest.startsWith(base)) rest = rest.slice(base.length);
  rest = rest.replace(/^\/+|\/+$/g, '');
  if (!rest) return null;
  const segment = rest.split('/')[0] ?? '';
  for (const [page, seg] of Object.entries(PAGE_SEGMENTS) as [AppPage, string][]) {
    if (seg === segment) return page;
  }
  return null;
}

export function readCurrentPage(pathname?: string): AppPage | null {
  if (pathname !== undefined) return parsePageFromPathname(pathname);
  if (typeof location === 'undefined') return null;
  return parsePageFromPathname(location.pathname);
}

/** Build a full in-app URL: `/page?search#hashBody`. */
export function buildAppUrl(page: AppPage, hashBody = '', search = ''): string {
  const body = getHashBody(hashBody);
  const hash = body ? `#${body}` : '';
  const qs = search ? (search.startsWith('?') ? search : `?${search.replace(/^\?+/, '')}`) : '';
  return `${pagePath(page)}${qs}${hash}`;
}

/** Update the browser URL to a page + optional hash body. */
export function writeAppUrl(
  page: AppPage,
  hashBody = '',
  opts?: { replace?: boolean; search?: string },
): void {
  if (typeof location === 'undefined') return;
  const search = opts?.search ?? location.search;
  const url = buildAppUrl(page, hashBody, search);
  if (typeof history === 'undefined') return;
  if (opts?.replace !== false) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}
