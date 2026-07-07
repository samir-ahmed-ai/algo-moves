import { useEffect, useState } from 'react';

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

function subscribeMediaQuery(
  mql: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
): () => void {
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }
  const legacy = mql as LegacyMediaQueryList;
  legacy.addListener?.(listener);
  return () => legacy.removeListener?.(listener);
}

/** Shared, SSR-safe media-query hook. Re-renders when the match state flips. */
export function useMediaQuery(query: string): boolean {
  const normalizedQuery = query.trim();
  const [matches, setMatches] = useState(() =>
    normalizedQuery && typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(normalizedQuery).matches
      : false,
  );

  useEffect(() => {
    if (!normalizedQuery) {
      setMatches(false);
      return;
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setMatches(false);
      return;
    }
    const mql = window.matchMedia(normalizedQuery);
    const onChange = () => setMatches(mql.matches);
    onChange();
    return subscribeMediaQuery(mql, onChange);
  }, [normalizedQuery]);

  return matches;
}

/** Phones / very narrow viewports — chrome collapses to overlay drawers below this. */
export const MOBILE_QUERY = '(max-width: 767px)';

/** True on phone-sized viewports. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
