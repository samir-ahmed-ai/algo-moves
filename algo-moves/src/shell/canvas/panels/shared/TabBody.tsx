import { cn } from '../../../../lib/cn';
import { useWorkspace } from '../../../../lib/workspace';
import { useCanvasStatic } from '../../CanvasContext';

export function TabBody({ kind }: { kind: string }) {
  const { plugin } = useCanvasStatic();
  const { theme, density } = useWorkspace();
  const tab = plugin.tabs?.find((t) => t.id === kind);
  if (!tab) return null;
  const Panel = tab.Panel;
  return (
    <div className={cn('nodrag', (tab.mode === 'practice' || tab.mode === 'learn') && 'practice')}>
      <Panel theme={theme} density={density === 'ultra' ? 'compact' : density} />
    </div>
  );
}
