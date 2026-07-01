import { type ReactNode, useMemo } from 'react';
import {
  ChevronsDownUp,
  Code2,
  Crosshair,
  FileQuestion,
  FileText,
  Keyboard,
  Lock,
  LockOpen,
  Palette,
  PanelBottomOpen,
  PanelRightOpen,
  Puzzle,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useWorkspace } from '../../../lib/workspace';
import { traceOutputForPanel } from '../../../lib/trace';
import { resolveCodePieces } from '../../../lib/codePieces';
import { ACCENTS, FIT_PADDING_FOCUS } from '../layout';
import { FIT_VIEW_DURATION_MS } from '../canvasTokens';
import { togglePanelCollapse } from '../panelCollapse';
import {
  PanelHeader,
  PanelHeaderAction,
  PanelHeaderActions,
  PanelHeaderGrip,
  PanelHeaderIcon,
  PanelHeaderMenu,
  PanelHeaderTitle,
  type HeaderDensity,
  type PanelHeaderMenuItem,
} from '../nodeui';
import type { PanelFlowNode, PanelNodeData } from './panelTypes';
import { panelAccent, panelKindIcon } from './panelIcons';
import { HeaderPlay, HeaderStep } from './PanelHeaderControls';
import { useCanvasActions, useCanvasFrame, useCanvasStatic } from '../CanvasContext';

function VizSpawnBtn({
  label,
  title,
  disabled,
  icon,
  onClick,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <PanelHeaderAction variant="ghost" label={label} title={title} disabled={disabled} onClick={onClick}>
      {icon}
    </PanelHeaderAction>
  );
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
  showDockToggle,
  bottomDockOpen,
  onToggleDock,
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
  showDockToggle: boolean;
  bottomDockOpen: boolean;
  onToggleDock: () => void;
  inlineToolbar?: ReactNode;
  headerClassName?: string;
}) {
  const { setNodes, setEdges, fitView, getNode } = useReactFlow();
  const { setTracePreviewOpen } = useWorkspace();
  const { frames, player } = useCanvasFrame();
  const { spawnConnectedPanel } = useCanvasActions();
  const { plugin } = useCanvasStatic();
  const locked = !!data.locked;
  const isViz = data.kind === 'viz';
  const isProblem = data.kind === 'problem';
  const inVisualize = mode === 'visualize';
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
      icon: <FileText className="h-3 w-3" />,
      onClick: () => {
        const snippet = traceOutputForPanel(data.kind, frames, player.index);
        navigator.clipboard?.writeText(snippet);
        setTracePreviewOpen(true);
      },
    },
    { label: data.collapsed ? 'Restore panel' : 'Minimize panel', icon: <ChevronsDownUp className="h-3 w-3" />, onClick: minimize },
    { label: 'Focus panel', icon: <Crosshair className="h-3 w-3" />, onClick: focus },
    { label: 'Cycle accent', icon: <Palette className="h-3 w-3" />, onClick: cycleAccent },
    {
      label: locked ? 'Unlock panel' : 'Lock panel',
      icon: locked ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />,
      onClick: toggleLock,
    },
    ...(isViz && mode === 'visualize'
      ? [
          {
            label: 'Add Code Studio panel',
            icon: <Code2 className="h-3 w-3" />,
            disabled: !hasCode,
            onClick: () => spawnConnectedPanel('code', id),
          },
          {
            label: 'Add Structure panel',
            icon: <Puzzle className="h-3 w-3" />,
            disabled: !hasReassemble,
            onClick: () => spawnConnectedPanel('reassemble', id),
          },
          {
            label: 'Add Recall panel',
            icon: <Keyboard className="h-3 w-3" />,
            disabled: !hasCode,
            onClick: () => spawnConnectedPanel('recall', id),
          },
        ]
      : []),
    ...(isViz && mode === 'visualize' && showSideToggle
      ? [
          {
            label: sideOpen ? `Hide ${sideLabel} panel` : `Show ${sideLabel} panel`,
            icon: <PanelRightOpen className="h-3 w-3" />,
            onClick: onToggleSide,
          },
        ]
      : []),
    {
      label: 'Remove panel',
      icon: <Trash2 className="h-3 w-3" />,
      danger: true,
      disabled: locked,
      onClick: remove,
    },
  ];

  const inlineSideToggle = showSideToggle && !(isViz && mode === 'visualize');

  return (
    <PanelHeader selected={selected} collapsed={collapsed} locked={locked} density={density} className={headerClassName}>
      {!locked && mode !== 'visualize' && <PanelHeaderGrip density={density} />}
      <PanelHeaderIcon density={density}>{panelKindIcon(data.kind) ?? <FileQuestion className="h-[var(--node-icon,16px)] w-[var(--node-icon,16px)]" />}</PanelHeaderIcon>

      <PanelHeaderTitle density={density} className={locked ? 'cursor-default' : undefined}>
        {data.title}
      </PanelHeaderTitle>

      {inlineToolbar}

      <PanelHeaderActions>
        {collapsed ? (
          <>
            {isViz && <HeaderStep />}
            <PanelHeaderAction variant="ghost" title="Restore panel" onClick={minimize}>
              <ChevronsDownUp className="h-3.5 w-3.5" />
            </PanelHeaderAction>
          </>
        ) : (
          <>
            {isViz && mode !== 'visualize' && (
              <>
                <HeaderStep />
                <PanelHeaderAction
                  variant="toggle"
                  active={showBigO}
                  title={showBigO ? 'Hide Big-O cost' : 'Show Big-O cost'}
                  onClick={onToggleBigO}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                </PanelHeaderAction>
                <HeaderPlay />
              </>
            )}
            {isViz && mode === 'visualize' && (
              <>
                <VizSpawnBtn
                  label="Code Studio"
                  disabled={!hasCode}
                  title={hasCode ? 'Add Code Studio — quiz, structure, and recall' : 'No source code for this problem'}
                  icon={<Code2 className="h-3.5 w-3.5 shrink-0" />}
                  onClick={() => spawnConnectedPanel('code', id)}
                />
                <VizSpawnBtn
                  label="Structure"
                  disabled={!hasReassemble}
                  title={hasReassemble ? 'Add Structure — reassemble code blocks' : 'No code blocks for this problem'}
                  icon={<Puzzle className="h-3.5 w-3.5 shrink-0" />}
                  onClick={() => spawnConnectedPanel('reassemble', id)}
                />
                <VizSpawnBtn
                  label="Recall"
                  disabled={!hasCode}
                  title={hasCode ? 'Add Recall — rebuild solution from memory' : 'No source code for this problem'}
                  icon={<Keyboard className="h-3.5 w-3.5 shrink-0" />}
                  onClick={() => spawnConnectedPanel('recall', id)}
                />
                <HeaderStep />
                <PanelHeaderAction
                  variant="toggle"
                  active={showBigO}
                  title={showBigO ? 'Hide Big-O cost' : 'Show Big-O cost'}
                  onClick={onToggleBigO}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                </PanelHeaderAction>
              </>
            )}
            {isProblem && inVisualize && (
              <>
                <PanelHeaderAction variant="ghost" title="Focus panel" onClick={focus}>
                  <Crosshair className="h-3.5 w-3.5" />
                </PanelHeaderAction>
                <PanelHeaderAction variant="ghost" title="Minimize panel" onClick={minimize}>
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                </PanelHeaderAction>
              </>
            )}
            {showDockToggle && (
              <PanelHeaderAction
                variant="toggle"
                active={bottomDockOpen}
                title={bottomDockOpen ? 'Hide Replay · Inspector · Metrics dock' : 'Show Replay · Inspector · Metrics dock'}
                onClick={onToggleDock}
              >
                <PanelBottomOpen className="h-3.5 w-3.5" />
              </PanelHeaderAction>
            )}
            {inlineSideToggle && (
              <PanelHeaderAction
                variant="toggle"
                active={sideOpen}
                title={sideOpen ? `Hide ${sideLabel} panel` : `Show ${sideLabel} panel`}
                onClick={onToggleSide}
              >
                <PanelRightOpen className="h-3.5 w-3.5" />
              </PanelHeaderAction>
            )}
            {locked && (
              <PanelHeaderAction variant="ghost" active title="Panel locked" disabled>
                <Lock className="h-3.5 w-3.5" />
              </PanelHeaderAction>
            )}
            {!locked && (
              <PanelHeaderAction variant="ghost" title="Remove panel" onClick={remove}>
                <Trash2 className="h-3.5 w-3.5" />
              </PanelHeaderAction>
            )}
          </>
        )}
        <PanelHeaderMenu items={menuItems} />
      </PanelHeaderActions>
    </PanelHeader>
  );
}
