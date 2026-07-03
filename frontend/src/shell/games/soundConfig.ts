/**
 * Wires the pure games sound engine (@/lib/utils/audio) to the store's
 * persistence for the "muted" preference. Keeps the store dependency in the
 * shell/games layer instead of leaking it into lib. Call `ensureSoundConfig()`
 * from the arcade entry; it is idempotent.
 */
import { configureSoundPersistence } from '@/lib/utils/audio';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

let configured = false;

export function ensureSoundConfig(): void {
  if (configured) return;
  configured = true;
  configureSoundPersistence(
    readStorageText(STORAGE_KEYS.GAMES_MUTED) === '1',
    (muted) => writeStorageText(STORAGE_KEYS.GAMES_MUTED, muted ? '1' : '0'),
  );
}
