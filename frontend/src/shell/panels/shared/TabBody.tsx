import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';

import { useCanvasStatic } from '@/shell/canvas';
export function TabBody({ kind }: { kind: string }) {
  const { plugin } = useCanvasStatic();
  const { theme, density } = useWorkspace();
  const tab = plugin.tabs?.find((t) => t.id === kind);
  if (!tab) return null;
  const Panel = tab.Panel;
  return (
    <div
      className={cn(
        'panel-tab-body nodrag',
        tab.mode === 'practice' && 'panel-tab-body--practice practice',
        tab.mode === 'learn' && 'panel-tab-body--learn practice',
      )}
    >
      <Panel theme={theme} density={density === 'ultra' ? 'compact' : density} />
    </div>
  );
}
