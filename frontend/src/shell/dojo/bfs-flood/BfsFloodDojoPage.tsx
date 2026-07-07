import { Network } from 'lucide-react';
import { DojoGameChrome } from '../ui/DojoGameChrome';

/** Placeholder — the Flood Gate game is built in. */
export function BfsFloodDojoPage() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <DojoGameChrome icon={Network} title="Flood Gate" completedCount={0} levelCount={5} />
      <div className="grid flex-1 place-items-center text-sm text-ink3">Coming soon</div>
    </div>
  );
}
