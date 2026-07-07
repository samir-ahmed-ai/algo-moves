/** Top-level app pages — pathname segment before the hash. */
export type AppPage = 'home' | 'mobile' | 'vim' | 'games' | 'workspace' | 'plans';

const PAGE_SEGMENTS: Record<AppPage, string> = {
  home: 'home',
  mobile: 'mobile',
  vim: 'vim',
  games: 'games',
  workspace: 'workspace',
  plans: 'plans',
};

/** Vite base path without trailing slash, e.g. "" or "/algo-moves". */
export function getAppBasePath(): string {
  const base = import.meta.env.BASE_URL || '/';
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
  return hash.startsWith('#') ? hash.slice(1) : hash;
}

/** Parse the page segment from a pathname; null at app root or unknown paths. */
export function parsePageFromPathname(pathname: string): AppPage | null {
  const base = getAppBasePath();
  let rest = pathname;
  if (base && rest.startsWith(base)) rest = rest.slice(base.length);
  rest = rest.replace(/^\/+|\/+$/g, '');
  if (!rest) return null;
  const segment = rest.split('/')[0];
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
  const hash = hashBody ? `#${hashBody}` : '';
  return `${pagePath(page)}${search || ''}${hash}`;
}

/** Update the browser URL to a page + optional hash body. */
export function writeAppUrl(page: AppPage, hashBody = '', opts?: { replace?: boolean; search?: string }) {
  if (typeof location === 'undefined') return;
  const search = opts?.search ?? location.search;
  const url = buildAppUrl(page, hashBody, search);
  if (opts?.replace !== false) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}

/** Strip legacy `#page/...` hashes into `/page#...` on first load. */
export function normalizeLegacyUrl() {
  if (typeof location === 'undefined') return;
  if (parsePageFromPathname(location.pathname)) return;

  const body = getHashBody(location.hash);
  if (!body) return;

  if (body === 'home') {
    history.replaceState(null, '', buildAppUrl('home', '', location.search));
    return;
  }

  for (const page of ['mobile', 'vim', 'games'] as const) {
    if (body === page || body.startsWith(`${page}/`)) {
      const hashBody = body === page ? '' : body.slice(page.length + 1);
      history.replaceState(null, '', buildAppUrl(page, hashBody, location.search));
      return;
    }
  }

  if (body.startsWith('s=') || body.includes('&s=')) {
    history.replaceState(null, '', buildAppUrl('workspace', body, location.search));
  }
}
