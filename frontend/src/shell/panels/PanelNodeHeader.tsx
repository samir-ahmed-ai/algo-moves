import { Children, type ReactNode, useMemo } from 'react';
import {
  ChevronsDownUp,
  Crosshair,
  FileQuestion,
  FileText,
  Keyboard,
  Lock,
  LockOpen,
  Palette,
  PanelRightOpen,
  Puzzle,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  ACCENTS,
  FIT_PADDING_FOCUS,
  FIT_VIEW_DURATION_MS,
  togglePanelCollapse,
  useCanvasActions,
  useCanvasFrame,
  useCanvasStatic,
  PanelHeader,
  PanelHeaderAction,
  PanelHeaderActions,
  PanelHeaderGrip,
  PanelHeaderIcon,
  PanelHeaderMenu,
  PanelHeaderTitle,
  nodeIconGlyph,
  useCanvasCollabOptional,
  NodePresenceAvatars,
  type HeaderDensity,
  type PanelHeaderMenuItem,
} from '@/shell/canvas';
import { useReactFlow } from '@xyflow/react';
import { useWorkspace } from '@/store/workspace';
import { traceOutputForPanel } from '@/lib/canvas';
import { resolveCodePieces } from '@/lib/code';
import type { PanelFlowNode, PanelNodeData } from './panelTypes';
import { panelAccent, panelKindIcon } from './panelIcons';
import { HeaderPlay, HeaderStep } from './PanelHeaderControls';
import { PanelHeaderLayoutMenu } from '@/shell/canvas/ui/PanelHeaderLayoutMenu';
import { cn } from '@/lib/utils/cn';

/** Renders at most two header action buttons; dev-only warning if exceeded. */
function HeaderActionSlots({ children }: { children: ReactNode }) {
  const slots = Children.toArray(children).filter(Boolean);
  if (import.meta.env.DEV && slots.length > 2) {
    console.warn(`PanelNodeHeader: expected at most 2 action buttons, got ${slots.length}`);
  }
  return <>{slots.slice(0, 2)}</>;
}

export function PanelNodeHeader({
  id,
  data,
  accent: _accent,
  selected,
  collapsed,
  density,
  mode,
  showBigO,
  onToggleBigO,
  showSideToggle,
  sideOpen,
  sideLabel,
  onToggleSide,
  inlineToolbar,
  headerClassName,
}: {
  id: string;
  data: PanelNodeData;
  accent: string;
  selected: boolean;
  collapsed: boolean;
  density: HeaderDensity;
  mode: string;
  showBigO: boolean;
  onToggleBigO: () => void;
  showSideToggle: boolean;
  sideOpen: boolean;
  sideLabel: string;
  onToggleSide: () => void;
  inlineToolbar?: ReactNode;
  headerClassName?: string;
}) {
  const { setNodes, setEdges, fitView, getNode } = useReactFlow();
  const { setTracePreviewOpen } = useWorkspace();
  const { frames, player } = useCanvasFrame();
  const { spawnConnectedPanel } = useCanvasActions();
  const { plugin } = useCanvasStatic();
  const collab = useCanvasCollabOptional();
  const locked = !!data.locked;
  const isViz = data.kind === 'viz';
  const isWorkbench = data.kind === 'workbench';
  const hasCode = !!plugin.code;
  const hasReassemble = useMemo(() => {
    const reference = plugin.code?.text ?? '';
    const pieces = resolveCodePieces(reference, plugin.codePieces);
    return pieces !== null && pieces.length > 0;
  }, [plugin.code, plugin.codePieces]);

  const minimize = () =>
    setNodes((nds) => nds.map((n) => (n.id === id ? togglePanelCollapse(n as PanelFlowNode) : n)));

  const focus = () => {
    const n = getNode(id);
    if (n) fitView({ padding: FIT_PADDING_FOCUS, duration: FIT_VIEW_DURATION_MS, nodes: [n] });
  };

  const remove = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const cycleAccent = () =>
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const d = (n.data ?? {}) as PanelNodeData;
        const cur = d.accent ?? panelAccent(d.kind);
        const idx = Math.max(0, ACCENTS.indexOf(cur));
        return { ...n, data: { ...d, accent: ACCENTS[(idx + 1) % ACCENTS.length] } };
      }),
    );

  const toggleLock = () =>
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const d = (n.data ?? {}) as PanelNodeData;
        const next = !d.locked;
        return { ...n, draggable: !next, data: { ...d, locked: next } };
      }),
    );

  const menuItems: PanelHeaderMenuItem[] = [
    {
      label: 'Preview trace',
      icon: <FileText className={nodeIconGlyph} />,
      onClick: () => {
        const snippet = traceOutputForPanel(data.kind, frames, player.index);
        navigator.clipboard?.writeText(snippet);
        setTracePreviewOpen(true);
      },
    },
    {
      label: data.collapsed ? 'Restore panel' : 'Minimize panel',
      icon: <ChevronsDownUp className={nodeIconGlyph} />,
      onClick: minimize,
    },
    { label: 'Focus panel', icon: <Crosshair className={nodeIconGlyph} />, onClick: focus },
    { label: 'Cycle accent', icon: <Palette className={nodeIconGlyph} />, onClick: cycleAccent },
    {
      label: locked ? 'Unlock panel' : 'Lock panel',
      icon: locked ? <LockOpen className={nodeIconGlyph} /> : <Lock className={nodeIconGlyph} />,
      onClick: toggleLock,
    },
    ...(isWorkbench && mode === 'visualize'
      ? [
          {
            label: 'Add Structure panel',
            icon: <Puzzle className={nodeIconGlyph} />,
            disabled: !hasReassemble,
            onClick: () => spawnConnectedPanel('reassemble', id),
          },
          {
            label: 'Add Recall panel',
            icon: <Keyboard className={nodeIconGlyph} />,
            disabled: !hasCode,
            onClick: () => spawnConnectedPanel('recall', id),
          },
        ]
      : []),
    ...(isViz && mode === 'visualize'
      ? [
          {
            label: 'Add Structure panel',
            icon: <Puzzle className={nodeIconGlyph} />,
            disabled: !hasReassemble,
            onClick: () => spawnConnectedPanel('reassemble', id),
          },
          {
            label: 'Add Recall panel',
            icon: <Keyboard className={nodeIconGlyph} />,
            disabled: !hasCode,
            onClick: () => spawnConnectedPanel('recall', id),
          },
        ]
      : []),
    ...(showSideToggle
      ? [
          {
            label: sideOpen ? `Hide ${sideLabel} panel` : `Show ${sideLabel} panel`,
            icon: <PanelRightOpen className={nodeIconGlyph} />,
            onClick: onToggleSide,
          },
        ]
      : []),
    {
      label: 'Remove panel',
      icon: <Trash2 className={nodeIconGlyph} />,
      danger: true,
      disabled: locked,
      onClick: remove,
    },
  ];

  const showInlineSideToggle = showSideToggle && !isViz && !isWorkbench;

  return (
    <PanelHeader
      selected={selected}
      collapsed={collapsed}
      locked={locked}
      density={density}
      className={cn(
        'panel-node-header',
        selected && 'panel-node-header--selected',
        collapsed && 'panel-node-header--collapsed',
        locked && 'panel-node-header--locked',
        headerClassName,
      )}
    >
      {!locked && mode !== 'visualize' && <PanelHeaderGrip density={density} />}
      <PanelHeaderIcon density={density} className="panel-node-header__icon">
        {panelKindIcon(data.kind) ?? <FileQuestion className={nodeIconGlyph} />}
      </PanelHeaderIcon>

      <PanelHeaderTitle
        density={density}
        className={cn('panel-node-header__title', locked ? 'cursor-default' : undefined)}
      >
        {data.title}
      </PanelHeaderTitle>

      {collab?.isCollaborating && mode === 'visualize' ? (
        <NodePresenceAvatars peers={collab.peers} nodeId={id} className="ms-1" />
      ) : null}

      {inlineToolbar}

      <PanelHeaderActions className="panel-node-header__actions">
        {collapsed ? (
          <HeaderActionSlots>
            <PanelHeaderAction variant="ghost" title="Restore panel" onClick={minimize}>
              <ChevronsDownUp className={nodeIconGlyph} />
            </PanelHeaderAction>
          </HeaderActionSlots>
        ) : (
          <HeaderActionSlots>
            {isViz && mode !== 'visualize' && (
              <>
                <PanelHeaderAction
                  variant="toggle"
                  active={showBigO}
                  title={showBigO ? 'Hide Big-O cost' : 'Show Big-O cost'}
                  onClick={onToggleBigO}
                >
                  <TrendingUp className={nodeIconGlyph} />
                </PanelHeaderAction>
                <HeaderPlay />
              </>
            )}
            {(isViz || isWorkbench) && mode === 'visualize' && (
              <PanelHeaderAction
                variant="toggle"
                active={showBigO}
                title={showBigO ? 'Hide Big-O cost' : 'Show Big-O cost'}
                onClick={onToggleBigO}
              >
                <TrendingUp className={nodeIconGlyph} />
              </PanelHeaderAction>
            )}
            {showInlineSideToggle && (
              <PanelHeaderAction
                variant="toggle"
                active={sideOpen}
                title={sideOpen ? `Hide ${sideLabel} panel` : `Show ${sideLabel} panel`}
                onClick={onToggleSide}
              >
                <PanelRightOpen className={nodeIconGlyph} />
              </PanelHeaderAction>
            )}
          </HeaderActionSlots>
        )}
        {selected && mode === 'visualize' && !locked && (
          <PanelHeaderLayoutMenu hostId={id} slots={data.layoutSlots} />
        )}
        {(isViz || isWorkbench) && <HeaderStep />}
        <PanelHeaderMenu items={menuItems} />
      </PanelHeaderActions>
    </PanelHeader>
  );
}
