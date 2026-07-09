import type { Catalog } from './catalog';
import { getAllCategories } from './taxonomy';
import { getItemsForCategory } from './browse';

/**
 * Binders that resolve a catalog item's referenced content by kind. `hasPlugin` is
 * always required; `hasLesson`/`hasCheckpoint` are supplied once those content types
 * exist (reading lessons — Phase 4; quiz checkpoints — Phase 5). When a binder is
 * omitted, items of that kind are not binding-checked (so the guard stays green
 * before the content type is built).
 */
export interface IntegrityBinders {
  hasPlugin: (id: string) => boolean;
  hasLesson?: (id: string) => boolean;
  hasCheckpoint?: (id: string) => boolean;
}

/**
 * Prove the catalog is renderable and coherent. Composed from four independent
 * sub-checks (each exported for focused unit tests):
 *  A. bindings — every `kind:'problem'` item with a `pluginId` binds to a real
 *     plugin; every `reading`/`quiz` item binds to a lesson/checkpoint (when the
 *     binder exists);
 *  B. prereq refs — every `prereqs` edge references an existing item;
 *  C. prereq DAG — the prereq graph has no cycle;
 *  D. categories — every browse category resolves to ≥1 drillable problem.
 *
 * Returns a flat list of human-readable error strings; `[]` means the catalog is
 * provably correct. Pure — safe to run in a unit test or CI script.
 */
export function checkCatalogIntegrity(catalog: Catalog, binders: IntegrityBinders): string[] {
  return [
    ...checkBindings(catalog, binders),
    ...checkPrereqRefs(catalog),
    ...checkPrereqDag(catalog),
    ...checkCategoriesNonEmpty(catalog),
  ];
}

/** A. Every item binds to the content its kind requires. */
export function checkBindings(catalog: Catalog, binders: IntegrityBinders): string[] {
  const errors: string[] = [];
  for (const it of catalog.items) {
    if (it.kind === 'problem') {
      if (it.pluginId && !binders.hasPlugin(it.pluginId)) {
        errors.push(`item '${it.id}' (problem) binds to unknown plugin '${it.pluginId}'`);
      }
    } else if (it.kind === 'reading') {
      if (binders.hasLesson && !binders.hasLesson(it.lessonId ?? it.id)) {
        errors.push(`item '${it.id}' (reading) has no lesson`);
      }
    } else if (it.kind === 'quiz') {
      if (binders.hasCheckpoint && !binders.hasCheckpoint(it.lessonId ?? it.id)) {
        errors.push(`item '${it.id}' (quiz) has no checkpoint`);
      }
    }
  }
  return errors;
}

/** B. Every prereq references an item that exists. */
export function checkPrereqRefs(catalog: Catalog): string[] {
  const itemIds = new Set(catalog.items.map((i) => i.id));
  const errors: string[] = [];
  for (const it of catalog.items) {
    for (const p of it.prereqs) {
      if (!itemIds.has(p)) errors.push(`item '${it.id}' lists unknown prereq '${p}'`);
    }
  }
  return errors;
}

/** C. The prereq graph is acyclic. */
export function checkPrereqDag(catalog: Catalog): string[] {
  const cycle = findPrereqCycle(catalog);
  return cycle ? [`prereq cycle detected: ${cycle.join(' -> ')}`] : [];
}

/** D. Every browse category resolves to at least one problem. */
export function checkCategoriesNonEmpty(catalog: Catalog): string[] {
  const errors: string[] = [];
  for (const cat of getAllCategories()) {
    if (getItemsForCategory(cat.id, catalog).length === 0) {
      errors.push(`browse category '${cat.id}' resolves to no problems`);
    }
  }
  return errors;
}

const WHITE = 0;
const GREY = 1;
const BLACK = 2;

/** DFS white/grey/black colouring; returns the first back-edge cycle path or null. */
function findPrereqCycle(catalog: Catalog): string[] | null {
  const color = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const it of catalog.items) {
    // Only follow edges to items that actually exist — dangling prereqs are reported
    // separately (check B) and must not crash the traversal.
    adj.set(
      it.id,
      it.prereqs.filter((p) => catalog.getItem(p) !== undefined && p !== it.id),
    );
    color.set(it.id, WHITE);
  }

  const path: string[] = [];
  let cycle: string[] | null = null;

  const visit = (id: string): boolean => {
    color.set(id, GREY);
    path.push(id);
    for (const next of adj.get(id) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GREY) {
        const start = path.indexOf(next);
        cycle = [...path.slice(start), next];
        return true;
      }
      if (c === WHITE && visit(next)) return true;
    }
    path.pop();
    color.set(id, BLACK);
    return false;
  };

  for (const it of catalog.items) {
    if ((color.get(it.id) ?? WHITE) === WHITE && visit(it.id)) break;
  }
  return cycle;
}
