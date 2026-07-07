import { Layers } from 'lucide-react';
import { DojoGameChrome } from '../ui/DojoGameChrome';
import { LEVEL_IDS } from './engine/skyline';

/** Placeholder — the Skyline Stack game is built in. */
export function MonoStackDojoPage() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <DojoGameChrome
        icon={Layers}
        title="Skyline Stack"
        completedCount={0}
        levelCount={LEVEL_IDS.length}
      />
      <div className="grid flex-1 place-items-center text-sm text-ink3">Coming soon</div>
    </div>
  );
}
