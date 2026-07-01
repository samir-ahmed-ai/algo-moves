import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { chromeText } from '../chromeUi';
import { cn } from '../../lib/cn';

const SHORTCUTS = [
  ['← / →', 'Step frames'],
  ['Space', 'Play / pause'],
  ['Home / End', 'First / last frame'],
  ['⌘K', 'Command palette'],
  ['?', 'Keyboard help'],
  ['F', 'Presentation mode'],
];

export function AppInfoPopover() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Help & shortcuts"
        className="grid h-7 w-7 place-items-center rounded-md text-ink3 hover:bg-panel2 hover:text-ink"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[min(90vw,14rem)] rounded-lg border border-edge bg-panel p-3 shadow-theme-lg">
          <h4 className={cn('font-semibold text-ink', chromeText.sm)}>Algo Moves</h4>
          <p className={cn('mt-1 text-ink3', chromeText.xs)}>Strudel-inspired algorithm studio</p>
          <ul className="mt-2 space-y-1">
            {SHORTCUTS.map(([k, v]) => (
              <li key={k} className={cn('flex justify-between gap-2', chromeText.xs)}>
                <kbd className="font-mono text-ink2">{k}</kbd>
                <span className="text-ink3">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
