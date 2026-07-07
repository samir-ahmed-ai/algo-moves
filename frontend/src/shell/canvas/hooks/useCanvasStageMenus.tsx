import { useCallback, useEffect } from 'react';
import type { Node } from '@xyflow/react';
import {
  Crosshair,
  ChevronsDownUp,
  Trash2,
  Palette,
  Maximize,
  LayoutGrid,
  Lock,
} from 'lucide-react';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { FIT_VIEW_DURATION_MS } from '../ui/canvasTokens';
import { FIT_PADDING_VIEW } from '../layout/layout';
import type { PanelNodeData } from '../nodes';
import type { MenuItem } from '../ui';

interface Menu {
  x: number;
  y: number;
  items: MenuItem[];
}

export function useCanvasStageMenus({
  wrapperRef,
  focusNode,
  fitView,
  reset,
  lock,
  setLock,
  setMenu,
  setNodes,
  recolorNode,
  minimizeNode,
  removeNode,
  toggleNodeLock,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  focusNode: (id: string) => void;
  fitView: (options?: { padding?: number; duration?: number }) => void;
  reset: () => void;
  lock: boolean;
  setLock: (updater: (locked: boolean) => boolean) => void;
  setMenu: (menu: Menu | null) => void;
  setNodes: React.Dispatch<React.SetStateAction<import('../nodes').PanelFlowNode[]>>;
  recolorNode: (id: string) => void;
  minimizeNode: (id: string) => void;
  removeNode: (id: string) => void;
  toggleNodeLock: (id: string) => void;
}) {
  const menuPos = (e: { clientX: number; clientY: number }) => {
    const r = wrapperRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault();
      const d = node.data as PanelNodeData;
      const { x, y } = menuPos(e);
      setMenu({
        x,
        y,
        items: [
          {
            label: 'Focus',
            icon: <Crosshair className="h-4 w-4" />,
            onClick: () => focusNode(node.id),
          },
          {
            label: 'Recolour',
            icon: <Palette className="h-4 w-4" />,
            onClick: () => recolorNode(node.id),
          },
          {
            label: d.collapsed ? 'Restore' : 'Minimize',
            icon: <ChevronsDownUp className="h-4 w-4" />,
            onClick: () => minimizeNode(node.id),
          },
          {
            label: d.locked ? 'Unlock panel' : 'Lock panel',
            icon: <Lock className="h-4 w-4" />,
            onClick: () => toggleNodeLock(node.id),
          },
          ...(d.locked
            ? []
            : [
                {
                  label: 'Remove panel',
                  icon: <Trash2 className="h-4 w-4" />,
                  danger: true,
                  onClick: () => removeNode(node.id),
                },
              ]),
        ],
      });
    },
    [focusNode, recolorNode, minimizeNode, removeNode, toggleNodeLock, setMenu],
  );

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault();
      const { x, y } = menuPos(e);
      setMenu({
        x,
        y,
        items: [
          {
            label: 'Fit view',
            icon: <Maximize className="h-4 w-4" />,
            onClick: () => fitView({ padding: FIT_PADDING_VIEW, duration: FIT_VIEW_DURATION_MS }),
          },
          {
            label: 'Tidy layout',
            icon: <LayoutGrid className="h-4 w-4" />,
            onClick: () => reset(),
          },
          {
            label: lock ? 'Unlock canvas' : 'Lock canvas',
            icon: <Lock className="h-4 w-4" />,
            onClick: () => setLock((l) => !l),
          },
        ],
      });
    },
    [fitView, reset, lock, setLock, setMenu],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (isEditableTarget(t)) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setNodes]);

  return { onNodeContextMenu, onPaneContextMenu };
}
