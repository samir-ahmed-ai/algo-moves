import { Activity, BarChart3, Contrast, Download, Gauge, Info, ScanSearch, Settings, Sparkles, Sun, Moon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { chromeText } from '../../chromeUi';
import { SECTION_MAX } from '../../SidebarShell';
import { useCanvasStatic, useCanvasFrame } from '../CanvasContext';
import { InspectorPaneContent, MetricsBody, ReplayContent } from '../nodes/PanelNode';
import { HudBtn } from '../ui/CanvasTools';
import { RADIUS_CTRL } from '../ui/nodeui';
import { SectionBadge } from './WidgetSection';
import type { CanvasWidget } from './types';

/** `n / total` step badge shared by the Replay section. */
function ReplayBadge() {
  const { frames, player } = useCanvasFrame();
  return <SectionBadge>{frames.length ? `${player.index + 1} / ${frames.length}` : '0'}</SectionBadge>;
}

function ReplayBody() {
  return (
    <div className="px-[var(--hpad)]">
      <ReplayContent columns={2} />
    </div>
  );
}

function InspectorBadge() {
  const { selectedNode } = useCanvasStatic();
  return selectedNode != null ? <SectionBadge>{selectedNode}</SectionBadge> : null;
}

function InspectorBody() {
  return (
    <div className="px-[var(--hpad)]">
      <InspectorPaneContent />
    </div>
  );
}

function MetricsBadge() {
  const { frames } = useCanvasFrame();
  return <SectionBadge>{frames.length}</SectionBadge>;
}

function MetricsBodyWrap() {
  return (
    <div className="px-[var(--hpad)]">
      <MetricsBody />
    </div>
  );
}

async function exportCanvasPng(filename: string) {
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
    a.download = `${filename || 'algo-moves'}.png`;
    a.click();
  } catch {
    // export unavailable
  }
}

function AppearanceBody() {
  const { theme, setTheme, density, cycleDensity, palette, setPalette } = useWorkspace();
  const { item } = useCanvasStatic();
  return (
    <div className="flex flex-wrap gap-0.5 px-[var(--hpad)]">
      <HudBtn onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
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
      <HudBtn onClick={() => exportCanvasPng(item.id)} title="Export canvas as PNG">
        <Download />
      </HudBtn>
    </div>
  );
}

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
        <a href={item.source.url} target="_blank" rel="noreferrer" className={cn('inline-flex items-center gap-1 text-accent hover:underline', chromeText.sm)}>
          {item.source.label}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

/** The stock sidebar sections, now expressed as registered widgets. */
export const BUILTIN_WIDGETS: CanvasWidget[] = [
  { id: 'replay', title: 'Replay', icon: <Activity className="h-3 w-3" />, tab: 'analysis', order: 10, Body: ReplayBody, Badge: ReplayBadge, maxHeightClass: SECTION_MAX.replay },
  { id: 'inspector', title: 'Inspector', icon: <ScanSearch className="h-3 w-3" />, tab: 'analysis', order: 20, Body: InspectorBody, Badge: InspectorBadge, maxHeightClass: SECTION_MAX.inspector },
  { id: 'metrics', title: 'Metrics', icon: <BarChart3 className="h-3 w-3" />, tab: 'analysis', order: 30, Body: MetricsBodyWrap, Badge: MetricsBadge, maxHeightClass: SECTION_MAX.metrics },
  { id: 'appearance', title: 'Appearance', icon: <Sparkles className="h-3 w-3" />, tab: 'more', order: 10, Body: AppearanceBody, maxHeightClass: SECTION_MAX.appearance },
  { id: 'about', title: 'About', icon: <Info className="h-3 w-3" />, tab: 'more', order: 20, Body: AboutBody, maxHeightClass: SECTION_MAX.about },
];
