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
    <section
      className="border-b border-edge bg-[var(--surface-elevated)] px-[var(--hpad)] py-[var(--gap)] shadow-[0_1px_0_color-mix(in_srgb,var(--border)_50%,transparent)]"
      aria-label="Install Algo Moves"
    >
      <div className="flex min-h-[var(--row)] items-center gap-[var(--gap)]">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
          <Download className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[length:var(--fs-tight)] font-semibold text-ink">
            Install Algo Moves
          </span>
          <span className="block truncate text-[length:var(--fs-2xs)] text-ink3">
            Practice from your home screen.
          </span>
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="shrink-0 rounded-full border border-accent/30 bg-accentbg px-2 py-1 text-[length:var(--fs-tight)] font-semibold text-accent shadow-theme-sm hover:opacity-90"
        >
          {expanded ? 'Hide' : 'How?'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss install banner"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink3 hover:bg-panel2 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <ol className="mt-2 space-y-1.5 rounded-2xl border border-edge bg-panel/70 p-3 text-[length:var(--fs-tight)] leading-snug text-ink2 shadow-theme-sm">
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
    </section>
  );
}

function AndroidBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <section
      className="flex min-h-[var(--row)] items-center gap-[var(--gap)] border-b border-edge bg-[var(--surface-elevated)] px-[var(--hpad)] py-[var(--gap)] shadow-[0_1px_0_color-mix(in_srgb,var(--border)_50%,transparent)]"
      aria-label="Install Algo Moves"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
        <Download className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[length:var(--fs-tight)] font-semibold text-ink">
          Install Algo Moves
        </span>
        <span className="block truncate text-[length:var(--fs-2xs)] text-ink3">
          Faster swipe drills from your launcher.
        </span>
      </span>
      <button
        type="button"
        onClick={onInstall}
        className="shrink-0 rounded-full bg-accent px-3 py-1 text-[length:var(--fs-tight)] font-semibold text-[var(--accent-contrast)] shadow-theme-sm hover:opacity-90"
      >
        Install
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss install banner"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink3 hover:bg-panel2 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </section>
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
