import { useCallback, useEffect, useState, type PointerEvent, type ReactNode } from 'react';
import {
  Sliders,
  SlidersHorizontal,
  ChevronUp,
  PanelBottomClose,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useWorkspace, type CanvasHudProps } from '../../lib/workspace';
import { CanvasPropsBody, PanelsBody } from './canvasChromeBodies';
import { ControlsAccordion, RADIUS_CTRL } from './nodeui';
import { ChromeLabel, chromeText } from '../chromeUi';

import { MIN_DOCK_H, DEFAULT_DOCK_H, CHROME_BTN, BOTTOM_RAIL_H } from '../chrome';

type DockTab = 'canvas' | 'panels';

function DockColumn({
  icon,
  label,
  open,
  onToggle,
  grow = 1,
  children,
}: {
  icon: ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  grow?: number;
  children: ReactNode;
}) {
  return (
    <section
      className="flex min-h-0 min-w-0 flex-col border-l border-edge first:border-l-0"
      style={{ flex: `${grow} 1 0%` }}
    >
      <ControlsAccordion
        title={label}
        open={open}
        fill
        onOpenChange={(next) => {
          if (next !== open) onToggle();
        }}
        className="border-t-0 px-1.5"
        bodyClassName={cn('ws-scroll min-h-0 flex-1 overflow-auto px-0 pb-1', chromeText.sm)}
        right={
          <span className="grid h-3 w-3 shrink-0 place-items-center text-ink3">
            {icon}
          </span>
        }
      >
        {children}
      </ControlsAccordion>
    </section>
  );
}

function BottomCollapsedRail({
  onExpand,
  onOpenCanvas,
  onOpenPanels,
}: {
  onExpand: () => void;
  onOpenCanvas: () => void;
  onOpenPanels: () => void;
}) {
  const btn = `relative grid ${CHROME_BTN} place-items-center rounded-[calc(var(--radius)-2px)] text-ink3 transition-colors hover:bg-panel2 hover:text-ink ${RADIUS_CTRL}`;

  return (
    <div
      className="unified-bottom-dock flex shrink-0 items-center gap-px border-t border-edge bg-panel px-1"
      style={{ height: BOTTOM_RAIL_H }}
    >
      <button type="button" onClick={onExpand} title="Expand canvas dock" aria-label="Expand canvas dock" className={btn}>
        <ChevronUp className="h-2.5 w-2.5" />
      </button>
      <button type="button" onClick={onOpenCanvas} title="Canvas properties" aria-label="Open canvas properties" className={btn}>
        <Sliders className="h-2.5 w-2.5" />
      </button>
      <button type="button" onClick={onOpenPanels} title="Panel toggles" aria-label="Open panel toggles" className={btn}>
        <SlidersHorizontal className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function TabbedDock({
  activeTab,
  onTab,
  hud,
}: {
  activeTab: DockTab;
  onTab: (t: DockTab) => void;
  hud: CanvasHudProps;
}) {
  const tabs: { id: DockTab; label: string; icon: ReactNode }[] = [
    { id: 'canvas', label: 'Canvas', icon: <Sliders className="h-3 w-3" /> },
    { id: 'panels', label: 'Panels', icon: <SlidersHorizontal className="h-3 w-3" /> },
  ];
  return (
    <>
      <div className="flex shrink-0 border-b border-edge">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={cn(
              'flex min-h-[var(--row)] flex-1 items-center justify-center gap-0.5 px-1 py-0 transition-colors',
              activeTab === t.id ? 'border-b-2 border-accent text-accent' : 'text-ink3 hover:text-ink2',
            )}
          >
            {t.icon}
            <ChromeLabel className={cn(activeTab === t.id && 'text-accent')}>{t.label}</ChromeLabel>
          </button>
        ))}
      </div>
      <div className={cn('ws-scroll min-h-0 flex-1 overflow-auto py-1', chromeText.sm)}>
        {activeTab === 'canvas' && <CanvasPropsBody hud={hud} compact />}
        {activeTab === 'panels' && <PanelsBody />}
      </div>
    </>
  );
}

/**
 * Docked bottom panel: Canvas properties + panel toggles with collapsible columns
 * and a slim collapsed rail.
 */
export function UnifiedBottomDock() {
  const { bottomDockOpen, setBottomDockOpen, bottomDockHeight, setBottomDockHeight, canvasHud } = useWorkspace();
  const [height, setHeight] = useState(bottomDockHeight || DEFAULT_DOCK_H);
  const [canvasOpen, setCanvasOpen] = useState(true);
  const [panelsOpen, setPanelsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<DockTab>('canvas');
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 900);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setHeight(bottomDockHeight || DEFAULT_DOCK_H);
  }, [bottomDockHeight]);

  useEffect(() => {
    setBottomDockHeight(height);
  }, [height, setBottomDockHeight]);

  const onGripDown = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = height;
      const move = (ev: globalThis.PointerEvent) => {
        const max = Math.max(MIN_DOCK_H, window.innerHeight * 0.72);
        setHeight(Math.min(max, Math.max(MIN_DOCK_H, startH + (startY - ev.clientY))));
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.style.userSelect = '';
      };
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [height],
  );

  const expand = (focus?: 'canvas' | 'panels') => {
    setBottomDockOpen(true);
    if (focus === 'canvas') {
      setCanvasOpen(true);
      setActiveTab('canvas');
    }
    if (focus === 'panels') {
      setPanelsOpen(true);
      setActiveTab('panels');
    }
  };

  if (!canvasHud) return null;

  if (!bottomDockOpen) {
    return (
      <BottomCollapsedRail
        onExpand={() => expand()}
        onOpenCanvas={() => expand('canvas')}
        onOpenPanels={() => expand('panels')}
      />
    );
  }

  return (
    <div
      className="algo-bottom-dock unified-bottom-dock relative flex shrink-0 flex-col border-t border-edge bg-panel/95 shadow-[var(--shadow-xl)] backdrop-blur"
      style={{ height }}
    >
      <div className="algo-bottom-dock__grip" onPointerDown={onGripDown} title="Drag to resize" />
      <header className="flex shrink-0 items-center gap-1 border-b border-edge px-1.5 py-px">
        <ChromeLabel className="min-w-0 flex-1 normal-case tracking-normal">Canvas</ChromeLabel>
        <button
          type="button"
          onClick={() => setBottomDockOpen(false)}
          title="Collapse dock"
          aria-label="Collapse dock"
          className={`grid ${CHROME_BTN} shrink-0 place-items-center rounded-[calc(var(--radius)-2px)] text-ink3 transition-colors hover:bg-panel2 hover:text-ink ${RADIUS_CTRL}`}
        >
          <PanelBottomClose className="h-2.5 w-2.5" />
        </button>
      </header>
      {narrow ? (
        <TabbedDock activeTab={activeTab} onTab={setActiveTab} hud={canvasHud} />
      ) : (
        <div className="flex min-h-0 flex-1">
          <DockColumn
            icon={<Sliders className="h-3 w-3" />}
            label="Properties"
            grow={2}
            open={canvasOpen}
            onToggle={() => setCanvasOpen((o) => !o)}
          >
            <CanvasPropsBody hud={canvasHud} compact />
          </DockColumn>

          <DockColumn
            icon={<SlidersHorizontal className="h-3 w-3" />}
            label="Panels"
            open={panelsOpen}
            onToggle={() => setPanelsOpen((o) => !o)}
          >
            <PanelsBody />
          </DockColumn>
        </div>
      )}
    </div>
  );
}
