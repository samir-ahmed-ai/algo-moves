import { Panel } from '@xyflow/react';
import { LayoutGrid, Maximize2 } from 'lucide-react';
import { useWorkspace } from '../../lib/workspace';
import { cn } from '../../lib/cn';
import { CanvasToolButtons, HudBtn } from './CanvasTools';
import { PresetPopover } from './PresetPopover';
import { WorkflowPresetPopover } from './WorkflowPresetPopover';
import { AppInfoPopover } from './AppInfoPopover';
import { ZoomSlider } from './ZoomSlider';

const TOOL_SHELL =
  'flex items-center gap-0.5 rounded-lg border border-edge bg-panel/95 p-0.5 shadow-[var(--shadow-lg)] backdrop-blur';

/** Top-right floating strip: undo/redo, align, preset, tidy, focus. */
export function CanvasToolsPanel() {
  const { canvasHud, canvasProject, present, focusCanvas, toggleFocusCanvas } = useWorkspace();

  if (present || !canvasHud) return null;

  return (
    <Panel position="top-right" className="!m-0 max-w-[calc(100vw-3rem)]" style={{ top: 8, right: 8 }}>
      <div className={cn(TOOL_SHELL, 'flex-wrap justify-end sm:flex-nowrap')}>
        <PresetPopover onApply={canvasHud.onPreset} />
        <WorkflowPresetPopover
          onApply={(preset) => canvasProject?.applyWorkflowPreset(preset)}
          dense
        />
        <ZoomSlider />
        <AppInfoPopover />
        <HudBtn nodrag variant="solid" onClick={canvasHud.onTidy} title="Tidy layout — re-organize panels">
          <LayoutGrid className="h-3 w-3" />
        </HudBtn>
        <HudBtn nodrag variant="solid" onClick={toggleFocusCanvas} title="Focus canvas (C)" active={focusCanvas}>
          <Maximize2 className="h-3 w-3" />
        </HudBtn>
        <CanvasToolButtons {...canvasHud.tools} />
      </div>
    </Panel>
  );
}
