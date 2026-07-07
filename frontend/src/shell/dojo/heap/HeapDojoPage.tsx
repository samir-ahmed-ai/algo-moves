import { Boxes } from 'lucide-react';
import { DojoGameChrome } from '../ui/DojoGameChrome';

/** Placeholder — the Top of the Heap game is built in. */
export function HeapDojoPage() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <DojoGameChrome icon={Boxes} title="Top of the Heap" completedCount={0} levelCount={5} />
      <div className="grid flex-1 place-items-center text-sm text-ink3">Coming soon</div>
    </div>
  );
}
