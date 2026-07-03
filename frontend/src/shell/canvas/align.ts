import type { PanelFlowNode } from './PanelNode';
import { layoutEstimate } from './nodeTokens';
import { getMeasuredHeight } from './measuredCache';

export type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vmiddle' | 'bottom';

const W = (n: PanelFlowNode) => n.width ?? layoutEstimate(n.data.kind ?? n.id).w;
const H = (n: PanelFlowNode) =>
  n.height ?? getMeasuredHeight(n.id) ?? layoutEstimate(n.data.kind ?? n.id).estH;

/** Align the selected nodes to a shared edge or center. Unselected nodes are untouched. */
export function applyAlign(nodes: PanelFlowNode[], kind: AlignKind): PanelFlowNode[] {
  const sel = nodes.filter((n) => n.selected);
  if (sel.length < 2) return nodes;
  const lefts = sel.map((n) => n.position.x);
  const rights = sel.map((n) => n.position.x + W(n));
  const tops = sel.map((n) => n.position.y);
  const bottoms = sel.map((n) => n.position.y + H(n));
  const minL = Math.min(...lefts);
  const maxR = Math.max(...rights);
  const minT = Math.min(...tops);
  const maxB = Math.max(...bottoms);
  const cx = (minL + maxR) / 2;
  const cy = (minT + maxB) / 2;

  const move = (n: PanelFlowNode): PanelFlowNode => {
    const p = { ...n.position };
    switch (kind) {
      case 'left':
        p.x = minL;
        break;
      case 'right':
        p.x = maxR - W(n);
        break;
      case 'hcenter':
        p.x = cx - W(n) / 2;
        break;
      case 'top':
        p.y = minT;
        break;
      case 'bottom':
        p.y = maxB - H(n);
        break;
      case 'vmiddle':
        p.y = cy - H(n) / 2;
        break;
    }
    return { ...n, position: p };
  };
  return nodes.map((n) => (n.selected ? move(n) : n));
}

/** Distribute the selected nodes with equal gaps between their centers along an axis. */
export function applyDistribute(nodes: PanelFlowNode[], dir: 'h' | 'v'): PanelFlowNode[] {
  const sel = nodes.filter((n) => n.selected);
  if (sel.length < 3) return nodes;
  const centerOf = (n: PanelFlowNode) => (dir === 'h' ? n.position.x + W(n) / 2 : n.position.y + H(n) / 2);
  const ordered = [...sel].sort((a, b) => centerOf(a) - centerOf(b));
  const first = centerOf(ordered[0]);
  const last = centerOf(ordered[ordered.length - 1]);
  const step = (last - first) / (ordered.length - 1);
  const target = new Map<string, number>();
  ordered.forEach((n, i) => target.set(n.id, first + step * i));
  return nodes.map((n) => {
    if (!n.selected || !target.has(n.id)) return n;
    const c = target.get(n.id)!;
    const p = { ...n.position };
    if (dir === 'h') p.x = c - W(n) / 2;
    else p.y = c - H(n) / 2;
    return { ...n, position: p };
  });
}
