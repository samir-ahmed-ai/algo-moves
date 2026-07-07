import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { dismissInstallPrompt, type PwaInstallState } from './usePwaInstall';

interface Props {
  state: PwaInstallState;
  onDismiss: () => void;
}

function IosBanner({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-edge bg-accentbg px-[var(--hpad)] py-[var(--gap)]">
      <div className="flex min-h-[var(--row)] items-center gap-[var(--gap)]">
        <Download className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate text-[length:var(--fs-tight)] font-medium text-ink">
          Install Algo Moves
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded px-1.5 py-px text-[length:var(--fs-tight)] font-medium text-accent hover:opacity-80"
        >
          {expanded ? 'Hide' : 'How?'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss install banner"
          className="grid h-5 w-5 shrink-0 place-items-center rounded text-ink3 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <ol className="mt-[var(--gap)] space-y-[var(--gap)] pl-1 text-[length:var(--fs-tight)] leading-snug text-ink2">
          <li className="flex items-center gap-1.5">
            <span className="font-semibold text-ink">1.</span>
            Tap the
            <Share className="inline h-3 w-3 text-accent" />
            <span className="font-semibold text-ink">Share</span> button in Safari.
          </li>
          <li>
            <span className="font-semibold text-ink">2.</span> Scroll down and tap{' '}
            <span className="font-semibold text-ink">"Add to Home Screen"</span>.
          </li>
          <li>
            <span className="font-semibold text-ink">3.</span> Tap{' '}
            <span className="font-semibold text-ink">"Add"</span> — done!
          </li>
        </ol>
      )}
    </div>
  );
}

function AndroidBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <div className="flex min-h-[var(--row)] items-center gap-[var(--gap)] border-b border-edge bg-accentbg px-[var(--hpad)] py-[var(--gap)]">
      <Download className="h-3.5 w-3.5 shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate text-[length:var(--fs-tight)] font-medium text-ink sm:hidden">
        Install app
      </span>
      <span className="hidden min-w-0 flex-1 truncate text-[length:var(--fs-tight)] font-medium text-ink sm:inline">
        Install Algo Moves on your home screen
      </span>
      <button
        type="button"
        onClick={onInstall}
        className="shrink-0 rounded-md bg-accent px-2 py-px text-[length:var(--fs-tight)] font-semibold text-white hover:opacity-90"
      >
        Install
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss install banner"
        className="grid h-5 w-5 shrink-0 place-items-center rounded text-ink3 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Compact banner rendered just below the MobileApp header.
 * Hidden when `state.kind === 'hidden'` (standalone, already dismissed, or unsupported browser).
 */
export function InstallAppBanner({ state, onDismiss }: Props) {
  if (state.kind === 'hidden') return null;

  const handleDismiss = () => {
    dismissInstallPrompt();
    onDismiss();
  };

  if (state.kind === 'ios') return <IosBanner onDismiss={handleDismiss} />;

  return (
    <AndroidBanner
      onInstall={() => {
        state.prompt();
        onDismiss();
      }}
      onDismiss={handleDismiss}
    />
  );
}
