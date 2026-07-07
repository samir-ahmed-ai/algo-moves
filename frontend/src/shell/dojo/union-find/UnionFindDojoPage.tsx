import { Link2 } from 'lucide-react';
import { DojoGameChrome } from '../ui/DojoGameChrome';

/** Placeholder — the Bridge Builder game is built in. */
export function UnionFindDojoPage() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <DojoGameChrome icon={Link2} title="Bridge Builder" completedCount={0} levelCount={5} />
      <div className="grid flex-1 place-items-center text-sm text-ink3">Coming soon</div>
    </div>
  );
}
