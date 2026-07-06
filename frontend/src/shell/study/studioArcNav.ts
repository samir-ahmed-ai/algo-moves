import type { StudioTab } from './studioTabs';

/** Label for the "Next all" control — hidden when already one step from the end. */
export function studioNextAllLabel(
  lastTab: StudioTab | undefined,
  cont: StudioTab | undefined,
): string | undefined {
  if (!lastTab || !cont || lastTab.id === cont.id) return undefined;
  return lastTab.label;
}

/** Tab immediately after `tabId` in the canonical arc order. */
export function studioTabAfter(order: StudioTab[], tabId: string): StudioTab | undefined {
  const i = order.findIndex((t) => t.id === tabId);
  return i >= 0 ? order[i + 1] : undefined;
}
