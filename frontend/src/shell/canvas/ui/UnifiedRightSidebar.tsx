import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import {
  Eye,
  GraduationCap,
  Play,
  PanelRight,
  PanelRightClose,
  Activity,
  Paintbrush,
  Sliders,
  SlidersHorizontal,
  MoreHorizontal,
  Users,
} from 'lucide-react';
import { useWorkspace, type RightSidebarTab } from '@/store/workspace';
import type { CanvasMode } from '../../../core';
import { cn } from '@/lib/utils/cn';
import {
  CollapsedRailButton,
  SIDEBAR_W,
  SIDEBAR_WIDE_W,
  SIDEBAR_RAIL_W,
  SidebarSection,
  SidebarTabBar,
  CHROME_BTN_MD,
  MobileDrawer,
  SECTION_MAX,
} from '../../SidebarShell';
import { useCanvasStatic, useCanvasFrame } from '../CanvasContext';
import { CanvasActionsBody, CanvasPropsBody, PanelsBody } from './canvasChromeBodies';
import { TransportBar } from './TransportBar';
import { NodePropertiesBody, useHasSelectedPanel } from './NodePropertiesBody';
import { nodeIcon, panelAccent } from '@/shell/panels';
import { Chip, RADIUS_CTRL } from './nodeui';
import { chromeText } from '../../chromeUi';
import { sidePanelTabs } from '../layout/layout';
import { widgetsForTab } from '../widgets/registry';
import { WidgetSection } from '../widgets/WidgetSection';
import { useCanvasCollabOptional } from '../collab/CanvasCollabProvider';

const MODES: { id: CanvasMode; label: string; icon: ReactNode }[] = [
  { id: 'visualize', label: 'Visualize', icon: <Eye className="h-3 w-3" /> },
  { id: 'learn', label: 'Learn', icon: <GraduationCap className="h-3 w-3" /> },
];

const TAB_LABELS: Record<RightSidebarTab, string> = {
  analysis: 'Analysis',
  canvas: 'Canvas',
  selection: 'Selection',
  collab: 'Collaborate',
  more: 'More',
};

function PluginTabSectionBody({ tabId }: { tabId: string }) {
  const { plugin } = useCanvasStatic();
  const { theme, density, mode } = useWorkspace();
  const tab = sidePanelTabs(plugin, mode).find((t) => t.id === tabId);
  if (!tab) return null;
  const Panel = tab.Panel;
  const isPractice = tab.mode === 'practice' || tab.mode === 'learn';

  return (
    <div className={cn('plugin-panel px-[var(--hpad)]', isPractice && 'practice')}>
      <Panel theme={theme} density={density === 'ultra' ? 'compact' : density} />
    </div>
  );
}

function RightCollapsedRail({
  onExpand,
  onOpenTab,
  pluginTabs,
  onOpenPluginTab,
  pluginActiveId,
  selectionActive,
  collabActive,
  showTransport,
}: {
  onExpand: () => void;
  onOpenTab: (tab: RightSidebarTab) => void;
  pluginTabs: { id: string; label: string }[];
  onOpenPluginTab: (tabId: string) => void;
  pluginActiveId: string | null;
  selectionActive: boolean;
  collabActive: boolean;
  showTransport: boolean;
}) {
  const btn = `grid ${CHROME_BTN_MD} place-items-center text-ink3 transition-colors hover:bg-panel2 hover:text-ink ${RADIUS_CTRL}`;

  return (
    <div
      className="unified-right-sidebar flex h-full shrink-0 flex-col items-center gap-px border-l border-edge bg-panel py-1"
      style={{ width: SIDEBAR_RAIL_W }}
    >
      <button type="button" onClick={onExpand} title="Expand sidebar" aria-label="Expand sidebar" className={btn}>
        <PanelRight className="h-3 w-3" />
      </button>
      <CollapsedRailButton title="Analysis" ariaLabel="Open analysis" onClick={() => onOpenTab('analysis')}>
        <Activity className="h-3 w-3" style={{ color: panelAccent('replay') }} />
      </CollapsedRailButton>
      <CollapsedRailButton title="Canvas" ariaLabel="Open canvas settings" onClick={() => onOpenTab('canvas')}>
        <Sliders className="h-3 w-3" />
      </CollapsedRailButton>
      {!showTransport && (
        <CollapsedRailButton title="Transport" ariaLabel="Open transport" onClick={() => onOpenTab('canvas')}>
          <Play className="h-3 w-3" />
        </CollapsedRailButton>
      )}
      <CollapsedRailButton
        title="Selection"
        ariaLabel="Open selection properties"
        onClick={() => onOpenTab('selection')}
        active={selectionActive}
      >
        <Paintbrush className="h-3 w-3" />
      </CollapsedRailButton>
      <CollapsedRailButton
        title="Collaborate"
        ariaLabel="Open collaboration"
        onClick={() => onOpenTab('collab')}
        active={collabActive}
      >
        <Users className={cn('h-3 w-3', collabActive && 'text-good')} />
      </CollapsedRailButton>
      {pluginTabs.map((t) => (
        <CollapsedRailButton
          key={t.id}
          title={t.label}
          ariaLabel={`Open ${t.label}`}
          onClick={() => onOpenPluginTab(t.id)}
          active={pluginActiveId === t.id}
        >
          <span className="grid h-3 w-3 place-items-center">{nodeIcon(t.id)}</span>
        </CollapsedRailButton>
      ))}
      <CollapsedRailButton title="More" ariaLabel="Open more settings" onClick={() => onOpenTab('more')}>
        <MoreHorizontal className="h-3 w-3" />
      </CollapsedRailButton>
    </div>
  );
}

/**
 * Docked right sidebar. The Analysis, Collaborate and More tabs are assembled
 * from the widget registry (see ./widgets) so features plug in without touching
 * this file; the Canvas and Selection tabs stay bespoke.
 */
export function UnifiedRightSidebar() {
  const {
    rightOpen,
    setRightOpen,
    rightTab,
    setRightTab,
    mode,
    setMode,
    enterCanvas,
    setProblemFocused,
    present,
    tweaks,
    sidePanelTab,
    setSidePanelTab,
    canvasHud,
    setRightWide,
    isMobile,
  } = useWorkspace();
  const { plugin } = useCanvasStatic();
  const { frames, player } = useCanvasFrame();
  const collab = useCanvasCollabOptional();
  const collabActive = collab?.isCollaborating ?? false;
  const showGlobalTransport = present || (mode === 'visualize' && tweaks.controls);

  const pluginTabs = sidePanelTabs(plugin, mode);
  const hasPlugin = pluginTabs.length > 0;
  const pluginActiveId =
    sidePanelTab && pluginTabs.some((t) => t.id === sidePanelTab) ? sidePanelTab : null;
  const selectionActive = useHasSelectedPanel();
  const stepLabel = frames.length ? `${player.index + 1} / ${frames.length}` : '0';

  const switchMode = useCallback(
    (m: CanvasMode) => {
      if (m === 'visualize') enterCanvas();
      else if (m === 'learn') {
        setMode('learn');
        setProblemFocused(true);
      } else setMode(m);
    },
    [enterCanvas, setMode, setProblemFocused],
  );

  const analysisWidgets = widgetsForTab('analysis');
  const collabWidgets = widgetsForTab('collab');
  const moreWidgets = widgetsForTab('more');

  const anyPluginOpen = pluginTabs.some(
    (t) => sidePanelTab === t.id || (!sidePanelTab && t.id === pluginTabs[0]?.id),
  );
  const wide = rightTab === 'analysis' && anyPluginOpen && hasPlugin;

  useEffect(() => {
    setRightWide(wide);
  }, [wide, setRightWide]);

  useEffect(() => {
    if (sidePanelTab && hasPlugin) {
      setRightOpen(true);
      setRightTab('analysis');
    }
  }, [sidePanelTab, hasPlugin, setRightOpen, setRightTab]);

  const expand = (tab: RightSidebarTab = 'analysis', pluginTabId?: string) => {
    setRightOpen(true);
    setRightTab(tab);
    if (pluginTabId) setSidePanelTab(pluginTabId);
  };

  const openPluginTab = (tabId: string) => expand('analysis', tabId);

  const sidebarTabs = useMemo(
    () =>
      [
        { id: 'analysis' as const, label: 'Analysis', icon: <Activity className="h-3 w-3" /> },
        { id: 'canvas' as const, label: 'Canvas', icon: <Sliders className="h-3 w-3" /> },
        { id: 'selection' as const, label: 'Selection', icon: <Paintbrush className="h-3 w-3" /> },
        { id: 'collab' as const, label: 'Collab', icon: <Users className={cn('h-3 w-3', collabActive && 'text-good')} /> },
        { id: 'more' as const, label: 'More', icon: <MoreHorizontal className="h-3 w-3" /> },
      ] satisfies { id: RightSidebarTab; label: string; icon: ReactNode }[],
    [collabActive],
  );

  if (!canvasHud) return null;

  if (!rightOpen) {
    return (
      <RightCollapsedRail
        onExpand={() => expand()}
        onOpenTab={(tab) => expand(tab)}
        pluginTabs={pluginTabs}
        onOpenPluginTab={openPluginTab}
        pluginActiveId={pluginActiveId}
        selectionActive={selectionActive}
        collabActive={collabActive}
        showTransport={showGlobalTransport}
      />
    );
  }

  const panel = (
    <div
      className={cn(
        'unified-right-sidebar flex h-full flex-col overflow-hidden bg-panel text-ink',
        isMobile ? 'w-full' : 'shrink-0 border-l border-edge',
      )}
      style={isMobile ? undefined : { width: wide ? SIDEBAR_WIDE_W : SIDEBAR_W }}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-edge px-[var(--hpad)] py-0.5">
        <span className={cn('min-w-0 flex-1 truncate font-semibold leading-tight text-ink', chromeText.sm)}>
          {TAB_LABELS[rightTab]}
        </span>
        <Chip tone="accent" mono className={cn('!px-1 !py-px', chromeText.xs)}>
          {stepLabel}
        </Chip>
        <div className="hidden min-w-0 flex-1 items-center justify-end gap-0.5 sm:flex [&_svg]:size-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => switchMode(m.id)}
              title={m.label}
              className={cn(
                chromeText.xs,
                `flex min-h-[var(--row)] items-center justify-center gap-0.5 px-1 py-0 font-medium transition-colors ${RADIUS_CTRL}`,
                mode === m.id ? 'bg-accent text-white shadow-sm' : 'text-ink2 hover:bg-panel2 hover:text-ink',
              )}
            >
              {m.icon}
              <span className="truncate">{m.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRightOpen(false)}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className={`grid ${CHROME_BTN_MD} shrink-0 place-items-center text-ink3 transition-colors hover:bg-panel2 hover:text-ink ${RADIUS_CTRL}`}
        >
          <PanelRightClose className="h-2.5 w-2.5" />
        </button>
      </header>

      <SidebarTabBar tabs={sidebarTabs} active={rightTab} onTab={setRightTab} />

      <div className={cn('ws-scroll min-h-0 flex-1 overflow-y-auto py-1', chromeText.sm)}>
        {rightTab === 'analysis' && (
          <div className="flex flex-col">
            {analysisWidgets.map((w) => (
              <WidgetSection key={w.id} widget={w} />
            ))}

            {pluginTabs.map((t) => {
              const open = sidePanelTab === t.id || (!sidePanelTab && t.id === pluginTabs[0]?.id);
              return (
                <SidebarSection
                  key={t.id}
                  icon={<span className="grid h-3 w-3 place-items-center">{nodeIcon(t.id)}</span>}
                  title={t.label}
                  open={open}
                  onToggle={() => setSidePanelTab(sidePanelTab === t.id ? null : t.id)}
                  maxHeightClass={SECTION_MAX.plugin}
                >
                  {open && <PluginTabSectionBody tabId={t.id} />}
                </SidebarSection>
              );
            })}
          </div>
        )}

        {rightTab === 'canvas' && canvasHud && (
          <div className="flex flex-col gap-2 px-[var(--hpad)]">
            {!showGlobalTransport && (
              <section>
                <p className={cn('mb-1 font-medium text-ink2', chromeText.sm)}>Transport</p>
                <TransportBar compact />
              </section>
            )}
            <section>
              <p className={cn('mb-1 flex items-center gap-1 font-medium text-ink2', chromeText.sm)}>
                <Sliders className="h-3 w-3" />
                Properties
              </p>
              <CanvasPropsBody hud={canvasHud} compact />
            </section>
            <section>
              <p className={cn('mb-1 font-medium text-ink2', chromeText.sm)}>Actions</p>
              <CanvasActionsBody hud={canvasHud} />
            </section>
            <section>
              <p className={cn('mb-1 flex items-center gap-1 font-medium text-ink2', chromeText.sm)}>
                <SlidersHorizontal className="h-3 w-3" />
                Panels
              </p>
              <PanelsBody />
            </section>
          </div>
        )}

        {rightTab === 'selection' && <NodePropertiesBody />}

        {rightTab === 'collab' && (
          <div className="flex flex-col">
            {collabWidgets.map((w) => (
              <WidgetSection key={w.id} widget={w} />
            ))}
          </div>
        )}

        {rightTab === 'more' && (
          <div className="flex flex-col">
            {moreWidgets.map((w) => (
              <WidgetSection key={w.id} widget={w} />
            ))}

            <div className="flex gap-0.5 px-[var(--hpad)] pt-1 sm:hidden [&_svg]:size-3">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => switchMode(m.id)}
                  title={m.label}
                  className={cn(
                    chromeText.sm,
                    `flex min-h-[var(--row)] flex-1 items-center justify-center gap-0.5 px-1 py-0 font-medium transition-colors ${RADIUS_CTRL}`,
                    mode === m.id ? 'bg-accent text-white shadow-sm' : 'text-ink2 hover:bg-panel2 hover:text-ink',
                  )}
                >
                  {m.icon}
                  <span className="truncate">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileDrawer
        side="right"
        label={TAB_LABELS[rightTab]}
        width={wide ? 'min(86vw, 360px)' : 'min(86vw, 300px)'}
        onClose={() => setRightOpen(false)}
      >
        {panel}
      </MobileDrawer>
    );
  }
  return panel;
}
