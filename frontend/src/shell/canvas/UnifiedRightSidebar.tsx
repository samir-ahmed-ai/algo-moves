import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Eye,
  GraduationCap,
  Play,
  Sun,
  Moon,
  Gauge,
  Contrast,
  Download,
  Info,
  ExternalLink,
  PanelRight,
  PanelRightClose,
  Sparkles,
  Settings,
  Paintbrush,
  Activity,
  ScanSearch,
  BarChart3,
  Sliders,
  SlidersHorizontal,
  MoreHorizontal,
} from 'lucide-react';
import { useWorkspace, type RightSidebarTab } from '@/store/workspace';
import type { CanvasMode } from '../../core';
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
} from '../SidebarShell';
import { useCanvasStatic, useCanvasFrame } from './CanvasContext';
import { CanvasActionsBody, CanvasPropsBody, PanelsBody } from './canvasChromeBodies';
import { HudBtn } from './CanvasTools';
import { TransportBar } from './TransportBar';
import { NodePropertiesBody, useHasSelectedPanel } from './NodePropertiesBody';
import { InspectorPaneContent, MetricsBody, ReplayContent, nodeIcon, panelAccent } from './PanelNode';
import { Chip, RADIUS_CTRL } from './nodeui';
import { chromeText } from '../chromeUi';
import { sidePanelTabs } from './layout';

const MODES: { id: CanvasMode; label: string; icon: ReactNode }[] = [
  { id: 'visualize', label: 'Visualize', icon: <Eye className="h-3 w-3" /> },
  { id: 'learn', label: 'Learn', icon: <GraduationCap className="h-3 w-3" /> },
];

const TAB_LABELS: Record<RightSidebarTab, string> = {
  analysis: 'Analysis',
  canvas: 'Canvas',
  selection: 'Selection',
  more: 'More',
};

function AboutBody() {
  const { item } = useCanvasStatic();
  const { setSettingsOpen } = useWorkspace();
  return (
    <div className={cn('flex flex-col gap-1.5 px-[var(--hpad)] leading-snug text-ink2', chromeText.sm)}>
      <p className={cn('font-medium text-ink', chromeText.sm)}>{item.title}</p>
      {item.summary && <p className={cn('text-ink3', chromeText.sm)}>{item.summary}</p>}
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className={cn(`inline-flex items-center gap-1 border border-edge px-1.5 py-1 text-ink2 transition-colors hover:border-accent hover:text-accent ${RADIUS_CTRL}`, chromeText.sm)}
      >
        <Settings className="h-2.5 w-2.5" />
        Settings
      </button>
      <div className={cn('flex flex-col gap-0.5', chromeText.sm, 'text-ink3')}>
        <span>· Drag a panel by its header; resize from its edges.</span>
        <span>· Shift-drag to box-select; Delete removes the selection.</span>
        <span>· Trash a panel; re-add it from the left sidebar.</span>
        <span>· Click the ✕ on an edge to cut it.</span>
        <span>· ←/→ step, space plays; toggle snap-to-grid in the Canvas tab.</span>
      </div>
      {item.source && (
        <a
          href={item.source.url}
          target="_blank"
          rel="noreferrer"
          className={cn('inline-flex items-center gap-1 text-accent hover:underline', chromeText.sm)}
        >
          {item.source.label}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

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
  showTransport,
}: {
  onExpand: () => void;
  onOpenTab: (tab: RightSidebarTab) => void;
  pluginTabs: { id: string; label: string }[];
  onOpenPluginTab: (tabId: string) => void;
  pluginActiveId: string | null;
  selectionActive: boolean;
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
 * Docked right sidebar: tabbed analysis, canvas settings, selection, and more.
 */
export function UnifiedRightSidebar() {
  const {
    rightOpen,
    setRightOpen,
    rightTab,
    setRightTab,
    mode,
    setMode,
    present,
    tweaks,
    theme,
    setTheme,
    density,
    cycleDensity,
    palette,
    setPalette,
    sidePanelTab,
    setSidePanelTab,
    canvasHud,
    setRightWide,
    isMobile,
  } = useWorkspace();
  const { selectedNode, plugin, item } = useCanvasStatic();
  const { frames, player } = useCanvasFrame();
  const showGlobalTransport = present || (mode === 'visualize' && tweaks.controls);

  const pluginTabs = sidePanelTabs(plugin, mode);
  const hasPlugin = pluginTabs.length > 0;
  const pluginActiveId =
    sidePanelTab && pluginTabs.some((t) => t.id === sidePanelTab) ? sidePanelTab : null;
  const selectionActive = useHasSelectedPanel();
  const stepLabel = frames.length ? `${player.index + 1} / ${frames.length}` : '0';
  const [replayOpen, setReplayOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(true);

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

  const exportPng = async () => {
    const el = document.querySelector('.react-flow') as HTMLElement | null;
    if (!el) return;
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, {
        backgroundColor: bgColor,
        pixelRatio: 2,
        filter: (n) => !(n instanceof HTMLElement && n.classList.contains('react-flow__panel')),
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${item.id || 'algo-moves'}.png`;
      a.click();
    } catch {
      // export unavailable
    }
  };

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
        { id: 'more' as const, label: 'More', icon: <MoreHorizontal className="h-3 w-3" /> },
      ] satisfies { id: RightSidebarTab; label: string; icon: ReactNode }[],
    [],
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
              onClick={() => setMode(m.id)}
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
            <SidebarSection
              icon={<Activity className="h-3 w-3" />}
              title="Replay"
              open={replayOpen}
              onToggle={() => setReplayOpen((o) => !o)}
              maxHeightClass={SECTION_MAX.replay}
              badge={stepLabel}
            >
              <div className="px-[var(--hpad)]">
                <ReplayContent columns={2} />
              </div>
            </SidebarSection>

            <SidebarSection
              icon={<ScanSearch className="h-3 w-3" />}
              title="Inspector"
              open={inspectorOpen}
              onToggle={() => setInspectorOpen((o) => !o)}
              maxHeightClass={SECTION_MAX.inspector}
              badge={selectedNode != null ? String(selectedNode) : undefined}
            >
              <div className="px-[var(--hpad)]">
                <InspectorPaneContent />
              </div>
            </SidebarSection>

            <SidebarSection
              icon={<BarChart3 className="h-3 w-3" />}
              title="Metrics"
              open={metricsOpen}
              onToggle={() => setMetricsOpen((o) => !o)}
              maxHeightClass={SECTION_MAX.metrics}
              badge={String(frames.length)}
            >
              <div className="px-[var(--hpad)]">
                <MetricsBody />
              </div>
            </SidebarSection>

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

        {rightTab === 'more' && (
          <div className="flex flex-col">
            <SidebarSection
              icon={<Sparkles className="h-3 w-3" />}
              title="Appearance"
              open={appearanceOpen}
              onToggle={() => setAppearanceOpen((o) => !o)}
              maxHeightClass={SECTION_MAX.appearance}
            >
              <div className="flex flex-wrap gap-0.5 px-[var(--hpad)]">
                <HudBtn
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                  {theme === 'dark' ? <Sun /> : <Moon />}
                </HudBtn>
                <HudBtn onClick={cycleDensity} title={`Density: ${density}`} active={density === 'ultra'}>
                  <Gauge />
                </HudBtn>
                <HudBtn
                  onClick={() => setPalette(palette === 'cb' ? 'default' : 'cb')}
                  title={palette === 'cb' ? 'Colour-blind palette: on' : 'Colour-blind palette: off'}
                  active={palette === 'cb'}
                >
                  <Contrast />
                </HudBtn>
                <HudBtn onClick={exportPng} title="Export canvas as PNG">
                  <Download />
                </HudBtn>
              </div>
            </SidebarSection>

            <SidebarSection
              icon={<Info className="h-3 w-3" />}
              title="About"
              open={aboutOpen}
              onToggle={() => setAboutOpen((o) => !o)}
              maxHeightClass={SECTION_MAX.about}
            >
              <AboutBody />
            </SidebarSection>

            <div className="flex gap-0.5 px-[var(--hpad)] pt-1 sm:hidden [&_svg]:size-3">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
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
