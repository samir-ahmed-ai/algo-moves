import { Boxes } from 'lucide-react';
import { DojoGameChrome } from '../ui/DojoGameChrome';
import { LEVEL_IDS } from './engine/heap';

/** Placeholder — the Top of the Heap game is built in. */
export function HeapDojoPage() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <DojoGameChrome
        icon={Boxes}
        title="Top of the Heap"
        completedCount={0}
        levelCount={LEVEL_IDS.length}
      />
      <div className="grid flex-1 place-items-center text-sm text-ink3">Coming soon</div>
    </div>
  );
}
