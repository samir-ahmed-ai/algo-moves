import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { useGameRoom } from '../net/useGameRoom';
import {
  DEFAULT_GAME_LOCALE,
  GAME_LOCALE_KEY,
  isGameLocale,
  localeFromSharedState,
  type GameLocale,
} from './types';

type GamesLocaleContextValue = {
  locale: GameLocale;
  setLocale: (locale: GameLocale) => void;
  isRtl: boolean;
  canChangeLocale: boolean;
};

const GamesLocaleContext = createContext<GamesLocaleContextValue | null>(null);

function readStoredLocale(): GameLocale {
  const stored = readStorageText(GAME_LOCALE_KEY);
  return isGameLocale(stored) ? stored : DEFAULT_GAME_LOCALE;
}

export function GamesLocaleProvider({ children }: { children: ReactNode }) {
  const { sharedState, role, publishState } = useGameRoom();
  const [localLocale, setLocalLocale] = useState<GameLocale>(readStoredLocale);

  const roomLocale = localeFromSharedState(sharedState);
  const locale = roomLocale ?? localLocale;
  const isRtl = locale === 'ar';
  const canChangeLocale = role !== 'guest' || roomLocale === null;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    return () => {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    };
  }, [locale, isRtl]);

  const setLocale = useCallback(
    (next: GameLocale) => {
      if (role === 'guest' && roomLocale !== null) return;
      setLocalLocale(next);
      writeStorageText(GAME_LOCALE_KEY, next);
      if (role === 'host') {
        publishState({ ...(sharedState as object | null), locale: next });
      }
    },
    [role, publishState, sharedState, roomLocale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, isRtl, canChangeLocale }),
    [locale, setLocale, isRtl, canChangeLocale],
  );

  return <GamesLocaleContext.Provider value={value}>{children}</GamesLocaleContext.Provider>;
}

export function useGamesLocale(): GamesLocaleContextValue {
  const ctx = useContext(GamesLocaleContext);
  if (!ctx) {
    throw new Error('useGamesLocale must be used within GamesLocaleProvider');
  }
  return ctx;
}
