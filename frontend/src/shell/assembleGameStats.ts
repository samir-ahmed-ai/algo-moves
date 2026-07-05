import type { AssembleGameStatsStore } from '@/components/puzzle/assemble';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

/**
 * Shell adapter for the assemble games' persistence port: one JSON blob per
 * game per scope, kept inside the storageKeys.ts namespace contract. Both
 * hosts (mobile deck card, Learn Studio assemble tab) share it so bests carry
 * across surfaces for the same problem + language.
 */
export function assembleGameStatsStore(scope: string): AssembleGameStatsStore {
  return {
    read<T extends object>(gameId: string, fallback: T): T {
      const raw = readStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST(gameId, scope), null);
      if (!raw) return fallback;
      try {
        return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
      } catch {
        return fallback;
      }
    },
    write(gameId: string, value: object) {
      writeStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST(gameId, scope), JSON.stringify(value));
    },
  };
}
