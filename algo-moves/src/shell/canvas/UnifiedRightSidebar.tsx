import { useEffect, useState, type ReactNode } from 'react';
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
} from 'lucide-react';
import { useWorkspace } from '../../lib/workspace';
import type { CanvasMode } from '../../core';
import { cn } from '../../lib/cn';
import { CollapsedRailButton, SECTION_MAX, SIDEBAR_W, SIDEBAR_WIDE_W, SIDEBAR_RAIL_W, SidebarSection, CHROME_BTN_MD, MobileDrawer } from '../SidebarShell';
import { useCanvasStatic, useCanvasFrame } from './CanvasContext';
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
        <span>· ←/→ step, space plays; toggle snap-to-grid in Canvas dock.</span>
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
  onOpenMode,
  onOpenTransport,
  onOpenReplay,
  onOpenInspector,
  onOpenMetrics,
  onOpenSelection,
  pluginTabs,
  onOpenPluginTab,
  pluginActiveId,
  selectionActive,
  showTransport,
}: {
  onExpand: () => void;
  onOpenMode: () => void;
  onOpenTransport: () => void;
  onOpenReplay: () => void;
  onOpenInspector: () => void;
  onOpenMetrics: () => void;
  onOpenSelection: () => void;
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
      <CollapsedRailButton title="Mode" ariaLabel="Open mode" onClick={onOpenMode}>
        <Eye className="h-3 w-3" />
      </CollapsedRailButton>
      {!showTransport && (
        <CollapsedRailButton title="Transport" ariaLabel="Open transport" onClick={onOpenTransport}>
          <Play className="h-3 w-3" />
        </CollapsedRailButton>
      )}
      <CollapsedRailButton title="Replay" ariaLabel="Open replay" onClick={onOpenReplay}>
        <Activity className="h-3 w-3" style={{ color: panelAccent('replay') }} />
      </CollapsedRailButton>
      <CollapsedRailButton title="Inspector" ariaLabel="Open inspector" onClick={onOpenInspector}>
        <ScanSearch className="h-3 w-3" style={{ color: panelAccent('inspector') }} />
      </CollapsedRailButton>
      <CollapsedRailButton title="Metrics" ariaLabel="Open metrics" onClick={onOpenMetrics}>
        <BarChart3 className="h-3 w-3" style={{ color: panelAccent('metrics') }} />
      </CollapsedRailButton>
      <CollapsedRailButton
        title="Selection"
        ariaLabel="Open selection properties"
        onClick={onOpenSelection}
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
    </div>
  );
}

/**
 * Docked right sidebar: mode, analysis (replay/inspector/metrics), selection,
 * plugin tab sections (one per tab), appearance, and about.
 */
export function UnifiedRightSidebar() {
  const {
    rightOpen,
    setRightOpen,
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
    selectedNode,
    setRightWide,
    isMobile,
  } = useWorkspace();
  const { plugin, item } = useCanvasStatic();
  const { frames, player } = useCanvasFrame();
  const showGlobalTransport = present || (mode === 'visualize' && tweaks.controls);

  const [modeOpen, setModeOpen] = useState(true);
  const [transportOpen, setTransportOpen] = useState(false);
  const [replayOpen, setReplayOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [pluginOpen, setPluginOpen] = useState<Record<string, boolean>>({});
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const pluginTabs = sidePanelTabs(plugin, mode);
  const hasPlugin = pluginTabs.length > 0;
  const pluginActiveId =
    sidePanelTab && pluginTabs.some((t) => t.id === sidePanelTab) ? sidePanelTab : null;
  const selectionActive = useHasSelectedPanel();
  const stepLabel = frames.length ? `${player.index + 1} / ${frames.length}` : '0';
  const anyPluginOpen = pluginTabs.some((t) => pluginOpen[t.id]);

  useEffect(() => {
    setPluginOpen((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const t of pluginTabs) {
        if (!(t.id in next)) {
          next[t.id] = t.id === pluginTabs[0]?.id;
          changed = true;
        }
      }
      for (const id of Object.keys(next)) {
        if (!pluginTabs.some((t) => t.id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pluginTabs]);

  useEffect(() => {
    setRightWide(anyPluginOpen && hasPlugin);
    if (sidePanelTab && hasPlugin) {
      setRightOpen(true);
      setPluginOpen((prev) => (prev[sidePanelTab] ? prev : { ...prev, [sidePanelTab]: true }));
    }
  }, [sidePanelTab, hasPlugin, anyPluginOpen, setRightOpen, setRightWide]);

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

  const expand = (
    focus?: 'mode' | 'transport' | 'replay' | 'inspector' | 'metrics' | 'selection' | 'plugin' | 'appearance' | 'about',
    pluginTabId?: string,
  ) => {
    setRightOpen(true);
    if (focus === 'mode') setModeOpen(true);
    if (focus === 'transport') setTransportOpen(true);
    if (focus === 'replay') setReplayOpen(true);
    if (focus === 'inspector') setInspectorOpen(true);
    if (focus === 'metrics') setMetricsOpen(true);
    if (focus === 'selection') setSelectionOpen(true);
    if (focus === 'plugin') {
      const tabId = pluginTabId ?? pluginTabs[0]?.id;
      if (tabId) {
        setPluginOpen((prev) => ({ ...prev, [tabId]: true }));
        setSidePanelTab(tabId);
      }
    }
    if (focus === 'appearance') setAppearanceOpen(true);
    if (focus === 'about') setAboutOpen(true);
  };

  const openPluginTab = (tabId: string) => expand('plugin', tabId);

  const togglePluginTab = (tabId: string) => {
    setPluginOpen((prev) => {
      const open = !prev[tabId];
      if (open) setSidePanelTab(tabId);
      else if (sidePanelTab === tabId) setSidePanelTab(null);
      return { ...prev, [tabId]: open };
    });
  };

  if (!canvasHud) return null;

  if (!rightOpen) {
    return (
      <RightCollapsedRail
        onExpand={() => expand()}
        onOpenMode={() => expand('mode')}
        onOpenTransport={() => expand('transport')}
        onOpenReplay={() => expand('replay')}
        onOpenInspector={() => expand('inspector')}
        onOpenMetrics={() => expand('metrics')}
        onOpenSelection={() => expand('selection')}
        pluginTabs={pluginTabs}
        onOpenPluginTab={openPluginTab}
        pluginActiveId={pluginActiveId}
        selectionActive={selectionActive}
        showTransport={showGlobalTransport}
      />
    );
  }

  const wide = anyPluginOpen && hasPlugin;

  const panel = (
    <div
      className={cn(
        'unified-right-sidebar flex h-full flex-col overflow-hidden bg-panel text-ink',
        isMobile ? 'w-full' : 'shrink-0 border-l border-edge',
      )}
      style={isMobile ? undefined : { width: wide ? SIDEBAR_WIDE_W : SIDEBAR_W }}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-edge px-[var(--hpad)] py-0.5">
        <span className={cn('min-w-0 flex-1 truncate font-semibold leading-tight text-ink', chromeText.sm)}>Analysis</span>
        <Chip tone="accent" mono className={cn('!px-1 !py-px', chromeText.xs)}>{stepLabel}</Chip>
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

      <div className="ws-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
        <SidebarSection
          icon={<Eye className="h-3 w-3" />}
          title="Mode"
          open={modeOpen}
          onToggle={() => setModeOpen((o) => !o)}
          maxHeightClass={SECTION_MAX.mode}
        >
          <div className="flex gap-0.5 px-[var(--hpad)] [&_svg]:size-3">
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
        </SidebarSection>

        {!showGlobalTransport && (
          <SidebarSection
            icon={<Play className="h-3 w-3" />}
            title="Transport"
            open={transportOpen}
            onToggle={() => setTransportOpen((o) => !o)}
            maxHeightClass={SECTION_MAX.transport}
          >
            <div className="px-[var(--hpad)]">
              <TransportBar compact />
            </div>
          </SidebarSection>
        )}

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

        <SidebarSection
          icon={<Paintbrush className="h-3 w-3" />}
          title="Selection"
          open={selectionOpen}
          onToggle={() => setSelectionOpen((o) => !o)}
          maxHeightClass={SECTION_MAX.selection}
          badge={selectionActive ? '1' : undefined}
        >
          <NodePropertiesBody />
        </SidebarSection>

        {pluginTabs.map((t) => (
          <SidebarSection
            key={t.id}
            icon={<span className="grid h-3 w-3 place-items-center">{nodeIcon(t.id)}</span>}
            title={t.label}
            open={!!pluginOpen[t.id]}
            onToggle={() => togglePluginTab(t.id)}
            maxHeightClass={SECTION_MAX.plugin}
          >
            <PluginTabSectionBody tabId={t.id} />
          </SidebarSection>
        ))}

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
            <HudBtn
              onClick={cycleDensity}
              title={`Density: ${density}`}
              active={density === 'ultra'}
            >
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
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileDrawer
        side="right"
        label="Analysis"
        width={wide ? 'min(86vw, 360px)' : 'min(86vw, 300px)'}
        onClose={() => setRightOpen(false)}
      >
        {panel}
      </MobileDrawer>
    );
  }
  return panel;
}
