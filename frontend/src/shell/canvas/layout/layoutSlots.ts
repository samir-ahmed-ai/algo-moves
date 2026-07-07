import type { PanelFlowNode, PanelNodeData } from '@/core/panelFlowTypes';

export const LAYOUT_SLOT_COUNT = 9;
export const LAYOUT_COLS = 3;
export const HOST_MIN_WIDTH = 560;
export const HOST_MIN_HEIGHT = 360;
export const LAYOUT_HEADER_HEIGHT = 44;
export const SLOT_PADDING = 8;
export const SLOT_GAP = 4;

export type SlotRect = { x: number; y: number; width: number; height: number };

function finiteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampSlotIndex(slotIndex: number): number | null {
  if (!Number.isFinite(slotIndex)) return null;
  const index = Math.trunc(slotIndex);
  return index >= 0 && index < LAYOUT_SLOT_COUNT ? index : null;
}

function safeSize(value: number | undefined, fallback: number): number {
  return Math.max(0, finiteNumber(value ?? fallback, fallback));
}

export function emptyLayoutSlots(): (string | null)[] {
  return Array(LAYOUT_SLOT_COUNT).fill(null);
}

/** Relative bounds for one cell in a host's 3×3 grid. */
export function slotRect(
  hostWidth: number,
  hostHeight: number,
  headerHeight: number,
  slotIndex: number,
): SlotRect {
  const index = clampSlotIndex(slotIndex) ?? 0;
  const safeHostW = safeSize(hostWidth, HOST_MIN_WIDTH);
  const safeHostH = safeSize(hostHeight, HOST_MIN_HEIGHT);
  const safeHeaderH = safeSize(headerHeight, LAYOUT_HEADER_HEIGHT);
  const bodyH = Math.max(0, safeHostH - safeHeaderH);
  const innerW = Math.max(0, safeHostW - SLOT_PADDING * 2 - SLOT_GAP * (LAYOUT_COLS - 1));
  const innerH = Math.max(0, bodyH - SLOT_PADDING * 2 - SLOT_GAP * 2);
  const cellW = innerW / LAYOUT_COLS;
  const cellH = innerH / LAYOUT_COLS;
  const col = index % LAYOUT_COLS;
  const row = Math.floor(index / LAYOUT_COLS);
  return {
    x: SLOT_PADDING + col * (cellW + SLOT_GAP),
    y: headerHeight + SLOT_PADDING + row * (cellH + SLOT_GAP),
    width: cellW,
    height: cellH,
  };
}

function nodeById(nodes: PanelFlowNode[], id: string): PanelFlowNode | undefined {
  return nodes.find((n) => n.id === id);
}

function hostSlots(data: PanelNodeData): (string | null)[] {
  const slots = data.layoutSlots;
  if (!slots?.length) return emptyLayoutSlots();
  const out = emptyLayoutSlots();
  for (let i = 0; i < LAYOUT_SLOT_COUNT; i++) out[i] = slots[i] ?? null;
  return out;
}

/** True when assigning child into host would create a parent cycle. */
export function wouldCreateLayoutCycle(
  nodes: PanelFlowNode[],
  hostId: string,
  childId: string,
): boolean {
  if (hostId === childId) return true;
  let cur: string | undefined = hostId;
  const seen = new Set<string>();
  while (cur) {
    if (cur === childId) return true;
    if (seen.has(cur)) break;
    seen.add(cur);
    cur = nodeById(nodes, cur)?.parentId;
  }
  return false;
}

function clearChildFromAllSlots(nodes: PanelFlowNode[], childId: string): PanelFlowNode[] {
  return nodes.map((n) => {
    const slots = n.data.layoutSlots;
    if (!slots?.some((id) => id === childId)) return n;
    return {
      ...n,
      data: {
        ...n.data,
        layoutSlots: hostSlots(n.data).map((id) => (id === childId ? null : id)),
      },
    };
  });
}

function unparentNode(
  nodes: PanelFlowNode[],
  childId: string,
  absPosition?: { x: number; y: number },
): PanelFlowNode[] {
  const child = nodeById(nodes, childId);
  if (!child?.parentId) return nodes;

  let position = absPosition;
  if (!position) {
    const host = nodeById(nodes, child.parentId);
    if (host) {
      position = {
        x: host.position.x + child.position.x,
        y: host.position.y + child.position.y,
      };
    } else {
      position = child.position;
    }
  }

  const { slotIndex: _, ...restData } = child.data;
  return nodes.map((n) => {
    if (n.id !== childId) return n;
    const next: PanelFlowNode = {
      ...n,
      parentId: undefined,
      extent: undefined,
      position,
      data: restData,
    };
    return next;
  });
}

function ensureHostSize(host: PanelFlowNode): PanelFlowNode {
  const w = Math.max(safeSize(host.width, HOST_MIN_WIDTH), HOST_MIN_WIDTH);
  const h = Math.max(safeSize(host.height, HOST_MIN_HEIGHT), HOST_MIN_HEIGHT);
  if (w === host.width && h === host.height) return host;
  return { ...host, width: w, height: h };
}

function applyChildToSlot(
  nodes: PanelFlowNode[],
  host: PanelFlowNode,
  slotIndex: number,
  childId: string,
): PanelFlowNode[] {
  const index = clampSlotIndex(slotIndex);
  if (index == null) return nodes;
  const hostW = safeSize(host.width, HOST_MIN_WIDTH);
  const hostH = safeSize(host.height, HOST_MIN_HEIGHT);
  const rect = slotRect(hostW, hostH, LAYOUT_HEADER_HEIGHT, index);

  return nodes.map((n) => {
    if (n.id === childId) {
      const { slotIndex: _prev, ...rest } = n.data;
      return {
        ...n,
        parentId: host.id,
        extent: 'parent' as const,
        position: { x: rect.x, y: rect.y },
        width: rect.width,
        height: rect.height,
        data: { ...rest, slotIndex: index },
      };
    }
    return n;
  });
}

/** Assign a child panel into a host's layout slot. */
export function assignNodeToSlot(
  nodes: PanelFlowNode[],
  hostId: string,
  slotIndex: number,
  childId: string,
): PanelFlowNode[] {
  const index = clampSlotIndex(slotIndex);
  if (index == null) return nodes;
  const host = nodeById(nodes, hostId);
  const child = nodeById(nodes, childId);
  if (!host || !child) return nodes;
  if (host.data.locked || child.data.locked) return nodes;
  if (wouldCreateLayoutCycle(nodes, hostId, childId)) return nodes;

  let next = clearChildFromAllSlots(nodes, childId);

  const slots = hostSlots(nodeById(next, hostId)!.data);
  const prevOccupant = slots[index];
  if (prevOccupant && prevOccupant !== childId) {
    next = unparentNode(next, prevOccupant);
    slots[index] = null;
  }
  slots[index] = childId;

  const hasAny = slots.some(Boolean);
  let hostNode = nodeById(next, hostId)!;
  if (hasAny) hostNode = ensureHostSize(hostNode);
  hostNode = {
    ...hostNode,
    data: { ...hostNode.data, layoutSlots: slots, layoutHost: true },
  };

  next = next.map((n) => (n.id === hostId ? hostNode : n));
  next = applyChildToSlot(next, hostNode, index, childId);
  return sortNodesParentFirst(next);
}

/** React Flow requires parent nodes before their children in the nodes array. */
export function sortNodesParentFirst(nodes: PanelFlowNode[]): PanelFlowNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = new Map<string, PanelFlowNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = childrenByParent.get(n.parentId) ?? [];
    list.push(n);
    childrenByParent.set(n.parentId, list);
  }

  const out: PanelFlowNode[] = [];
  const seen = new Set<string>();

  const visit = (n: PanelFlowNode) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    out.push(n);
    for (const child of childrenByParent.get(n.id) ?? []) visit(child);
  };

  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) continue;
    visit(n);
  }
  for (const n of nodes) {
    if (!seen.has(n.id)) out.push(n);
  }
  return out;
}

/** Remove a child from its slot and return it to the canvas. */
export function removeNodeFromSlot(nodes: PanelFlowNode[], childId: string): PanelFlowNode[] {
  const child = nodeById(nodes, childId);
  if (!child?.parentId || child.data.slotIndex == null) return nodes;

  const hostId = child.parentId;
  let next = unparentNode(nodes, childId);
  next = next.map((n) => {
    if (n.id !== hostId) return n;
    const slots = hostSlots(n.data).map((id) => (id === childId ? null : id));
    const hasAny = slots.some(Boolean);
    return {
      ...n,
      data: hasAny ? { ...n.data, layoutSlots: slots } : { ...n.data, layoutSlots: undefined },
    };
  });
  return next;
}

/** Recalculate slotted child positions after host resize. */
export function relayoutHostSlots(nodes: PanelFlowNode[], hostId: string): PanelFlowNode[] {
  const host = nodeById(nodes, hostId);
  if (!host?.data.layoutSlots?.some(Boolean)) return nodes;

  const slots = hostSlots(host.data);
  let next = nodes;
  for (let i = 0; i < LAYOUT_SLOT_COUNT; i++) {
    const childId = slots[i];
    if (childId) next = applyChildToSlot(next, host, i, childId);
  }
  return next;
}

/** When hosts are deleted, unparent slotted children onto the canvas. */
export function unparentOnHostDelete(
  nodes: PanelFlowNode[],
  deletedIds: Set<string>,
): PanelFlowNode[] {
  let next = nodes;
  for (const hostId of deletedIds) {
    const host = nodeById(next, hostId);
    const slots = host?.data.layoutSlots;
    if (!slots) continue;
    for (const childId of slots) {
      if (childId && !deletedIds.has(childId)) {
        next = unparentNode(next, childId);
      }
    }
  }
  return next;
}

/** Hit-test layout slot drop zones at screen coordinates (ignores dragged node overlay). */
export function findLayoutSlotAtPoint(
  clientX: number,
  clientY: number,
): { hostId: string; slotIndex: number } | null {
  if (typeof document === 'undefined') return null;
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  const els =
    typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)].filter(Boolean);
  for (const el of els) {
    if (!el) continue;
    const slotEl = (el as HTMLElement).closest?.('[data-layout-slot]');
    if (!slotEl) continue;
    const hostEl = slotEl.closest('[data-layout-host]');
    if (!hostEl) continue;
    const hostId = hostEl.getAttribute('data-layout-host');
    const slotRaw = slotEl.getAttribute('data-layout-slot');
    if (!hostId || slotRaw == null) continue;
    const slotIndex = clampSlotIndex(Number(slotRaw));
    if (slotIndex == null) continue;
    return { hostId, slotIndex };
  }
  return null;
}

/** Icon rect for slot preview in the 3×3 grid (12×12 viewBox). */
export function slotIconRect(slotIndex: number): { x: number; y: number; w: number; h: number } {
  const index = clampSlotIndex(slotIndex) ?? 0;
  const col = index % LAYOUT_COLS;
  const row = Math.floor(index / LAYOUT_COLS);
  const cell = 11 / LAYOUT_COLS;
  const pad = 0.5;
  const inner = cell - pad * 2;
  return {
    x: pad + col * cell,
    y: pad + row * cell,
    w: inner,
    h: inner,
  };
}
