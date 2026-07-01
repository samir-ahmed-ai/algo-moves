import { useEffect, useState } from 'react';

/** Shared, SSR-safe media-query hook. Re-renders when the match state flips. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Phones / very narrow viewports — chrome collapses to overlay drawers below this. */
export const MOBILE_QUERY = '(max-width: 767px)';

/** True on phone-sized viewports. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
