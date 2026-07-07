import { Waves } from 'lucide-react';
import { DojoGameChrome } from '../ui/DojoGameChrome';
import { LEVEL_IDS } from './engine/window';

/** Placeholder — the Window Shopper game is built in. */
export function SlidingWindowDojoPage() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <DojoGameChrome
        icon={Waves}
        title="Window Shopper"
        completedCount={0}
        levelCount={LEVEL_IDS.length}
      />
      <div className="grid flex-1 place-items-center text-sm text-ink3">Coming soon</div>
    </div>
  );
}
