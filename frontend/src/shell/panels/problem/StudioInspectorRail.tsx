import { useMemo } from 'react';
import {
  Eye,
  Gauge,
  Lightbulb,
  PanelLeftClose,
  PanelLeftOpen,
  StickyNote,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { useOverviewLayoutPrefs } from '@/store/user-prefs/overviewLayoutPrefs';
import { PanelBody } from '../PanelBodyRouter';

export interface InspectorTab {
  id: string;
  label: string;
  icon: LucideIcon;
  /** PanelBody kind rendered in the rail. */
  kind: string;
}

/** Secondary, toggleable panels docked beside the stage — reusing existing panel bodies. */
export const INSPECTOR_TABS: InspectorTab[] = [
  { id: 'bigo', label: 'Complexity', icon: Gauge, kind: 'bigo' },
  { id: 'inspector', label: 'Inspector', icon: Eye, kind: 'inspector' },
  { id: 'hints', label: 'Hints', icon: Lightbulb, kind: 'hints' },
  { id: 'notes', label: 'Notes', icon: StickyNote, kind: 'notes' },
];

/** Right-docked tabbed rail. Each tab is one of the app's existing panel bodies. */
export function StudioInspectorRail({
  tabs,
  activeId,
  onTab,
  onClose,
}: {
  tabs: InspectorTab[];
  activeId: string;
  onTab: (id: string) => void;
  onClose: () => void;
}) {
  const active = useMemo(() => tabs.find((t) => t.id === activeId) ?? tabs[0], [tabs, activeId]);
  if (!active) return null;

  return (
    <aside className="studio-inspector-rail flex w-[19rem] shrink-0 flex-col overflow-hidden border-l border-edge bg-panel">
      <div className="studio-inspector-rail__header flex h-9 shrink-0 items-center gap-2 border-b border-edge px-2.5">
        <span
          className={cn(
            'studio-inspector-rail__title flex items-center gap-1.5 font-semibold text-ink',
            chromeText.sm,
          )}
        >
          <active.icon className="h-4 w-4 text-accent" />
          Inspector
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          title="Hide inspector"
          aria-label="Hide inspector"
          className="studio-inspector-rail__close grid h-6 w-6 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="studio-inspector-rail__tabs flex shrink-0 gap-0.5 border-b border-edge p-1.5">
        {tabs.map((t) => {
          const on = t.id === active.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                'studio-inspector-tab flex flex-1 items-center justify-center gap-1.5 rounded-md px-1 py-1 font-medium transition-colors',
                chromeText.xs,
                on
                  ? 'studio-inspector-tab--active bg-accentbg text-accent'
                  : 'studio-inspector-tab--idle text-ink3 hover:bg-panel2 hover:text-ink',
              )}
              aria-pressed={on}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div
        key={active.id}
        className="studio-inspector-rail__body ws-scroll min-h-0 flex-1 overflow-auto"
      >
        <PanelBody kind={active.kind} />
      </div>
    </aside>
  );
}

/** Slim vertical dock — the always-visible show/hide surface for the stage rails. */
export function StudioPanelDock({
  tabs,
  inspectorOpen,
  activeId,
  onSelect,
}: {
  tabs: InspectorTab[];
  inspectorOpen: boolean;
  activeId: string;
  /** Open the rail to a tab, or toggle it closed when that tab is already showing. */
  onSelect: (id: string) => void;
}) {
  const [layout, setLayout] = useOverviewLayoutPrefs();
  const problemCollapsed = layout.problemCollapsed;

  return (
    <nav
      aria-label="Panels"
      className="studio-panel-dock flex w-11 shrink-0 flex-col items-center gap-1 border-l border-edge bg-panel py-2"
    >
      <DockBtn
        title={problemCollapsed ? 'Show problem' : 'Hide problem'}
        on={!problemCollapsed}
        onClick={() => setLayout({ problemCollapsed: !problemCollapsed })}
      >
        {problemCollapsed ? (
          <PanelLeftOpen className="h-[18px] w-[18px]" />
        ) : (
          <PanelLeftClose className="h-[18px] w-[18px]" />
        )}
      </DockBtn>
      <span className="studio-panel-dock__divider my-1 h-px w-5 bg-edge" aria-hidden />
      {tabs.map((t) => {
        const on = inspectorOpen && t.id === activeId;
        return (
          <DockBtn key={t.id} title={t.label} on={on} onClick={() => onSelect(t.id)}>
            <t.icon className="h-[18px] w-[18px]" />
          </DockBtn>
        );
      })}
    </nav>
  );
}

function DockBtn({
  title,
  on,
  onClick,
  children,
}: {
  title: string;
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'relative grid h-9 w-9 place-items-center rounded-md transition-colors',
        on
          ? 'studio-panel-dock__button studio-panel-dock__button--active bg-accentbg text-accent before:absolute before:-left-2 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-accent'
          : 'studio-panel-dock__button studio-panel-dock__button--idle text-ink3 hover:bg-panel2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
