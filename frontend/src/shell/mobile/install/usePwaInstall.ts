import { useEffect, useState } from 'react';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

// The event type is not in lib.dom.d.ts for all TS versions.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // navigator.standalone is Safari/iOS-specific; matchMedia covers Chrome/Android.
  if ((navigator as { standalone?: boolean }).standalone === true) return true;
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export type PwaInstallState =
  | { kind: 'hidden' }
  | { kind: 'android'; prompt: () => void }
  | { kind: 'ios' };

/**
 * Tracks PWA installability and exposes a stable state value for the banner.
 *
 * - `hidden`: already installed, or the user previously dismissed the banner.
 * - `android`: Chrome/Android deferred prompt is ready; call `prompt()` to trigger it.
 * - `ios`: iOS Safari, where no native prompt exists — show manual instructions.
 */
export function usePwaInstall(): PwaInstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed] = useState<boolean>(
    () => readStorageText(STORAGE_KEYS.INSTALL_PROMPT_DISMISSED) === '1',
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Hide banner once the app is installed via browser prompt.
  useEffect(() => {
    const handler = () => setDeferred(null);
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  if (dismissed || isRunningStandalone()) return { kind: 'hidden' };

  if (deferred) {
    return {
      kind: 'android',
      prompt: () => {
        void deferred.prompt();
        void deferred.userChoice.then(() => setDeferred(null));
      },
    };
  }

  if (isIos()) return { kind: 'ios' };

  return { kind: 'hidden' };
}

export function dismissInstallPrompt() {
  writeStorageText(STORAGE_KEYS.INSTALL_PROMPT_DISMISSED, '1');
}
