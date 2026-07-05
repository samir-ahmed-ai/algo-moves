import { Fragment, useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

import { useVimGame } from '../canvas/VimGameProvider';
function splitCombo(label: string): string[] {
  return label.split('+').filter(Boolean);
}

function KeyCombo({
  label,
  variant,
  pulse,
}: {
  label: string | null;
  variant: 'prev' | 'current';
  pulse?: boolean;
}) {
  if (!label) {
    return (
      <div className={cn('vim-key-hud__combo', `vim-key-hud__combo--${variant}`, 'vim-key-hud__combo--empty')}>
        <kbd className="vim-key-hud__cap" aria-hidden>
          ·
        </kbd>
      </div>
    );
  }

  const parts = splitCombo(label);

  return (
    <div
      className={cn(
        'vim-key-hud__combo',
        `vim-key-hud__combo--${variant}`,
        pulse && variant === 'current' && 'vim-key-hud__combo--pulse',
      )}
      aria-label={variant === 'current' ? `Current key: ${label}` : `Previous key: ${label}`}
    >
      {parts.map((part, i) => (
        <Fragment key={`${part}-${i}`}>
          {i > 0 ? <span className="vim-key-hud__plus" aria-hidden>+</span> : null}
          <kbd className="vim-key-hud__cap">{part}</kbd>
        </Fragment>
      ))}
    </div>
  );
}

export function KeyboardHud() {
  const { prevKey, currentKey } = useVimGame();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!currentKey) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 220);
    return () => window.clearTimeout(t);
  }, [currentKey]);

  return (
    <div className="vim-key-hud" role="status" aria-live="polite" aria-atomic="true">
      <KeyCombo label={prevKey} variant="prev" />
      <span className="vim-key-hud__sep" aria-hidden />
      <KeyCombo label={currentKey} variant="current" pulse={pulse} />
    </div>
  );
}
