import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/shell/auth/AuthProvider';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { readStorageJson, removeStorageValue, writeStorageJson } from '@/store/persistence/storage';
import { getPrepPlan, updatePrepPlan, type PrepPlan } from './data/prepPlansApi';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanBuilderApi {
  /** The plan currently loaded in the builder/runner, or null. */
  activePlan: PrepPlan | null;
  /** Ordered item ids in the active plan. */
  itemIds: string[];
  /** Set of item ids marked as completed. */
  completed: Set<string>;
  /** True while a plan is loaded and the tray is visible. */
  isBuilding: boolean;
  /** True while the step-through runner is active. */
  isRunning: boolean;
  /** Current index in the runner (0-based). */
  runnerIndex: number;

  /** Load a plan from the backend and enter building mode. Resolves to the plan. */
  loadPlan: (planId: string) => Promise<PrepPlan | null>;
  /** Unload the active plan (exit building/running). */
  closePlan: () => void;

  /** Add a problem item to the active plan (no-op if not building or already present). */
  addItem: (itemId: string) => void;
  /** Remove a problem item from the active plan. */
  removeItem: (itemId: string) => void;
  /** Move an item from one position to another (drag-reorder). */
  reorderItem: (fromIndex: number, toIndex: number) => void;
  /** Toggle the completed state of an item. */
  toggleComplete: (itemId: string) => void;
  /** Rename the active plan (persists on the usual debounce). */
  renamePlan: (title: string) => void;

  /** Manually trigger a save to the backend (also auto-debounced on change). */
  save: () => Promise<void>;
  /** Whether a save is in flight. */
  saving: boolean;

  /** Enter run mode at a specific index (default 0). */
  startRun: (index?: number) => void;
  /** Exit run mode (returns to building). */
  stopRun: () => void;
  /** Go to next item in runner. */
  nextItem: () => void;
  /** Go to previous item in runner. */
  prevItem: () => void;

  /** True when itemId is in the active plan. */
  hasItem: (itemId: string) => boolean;
}

// ─── Persistence ────────────────────────────────────────────────────────────────

interface PersistedActive {
  planId: string;
  running: boolean;
}

function isPersistedActive(v: unknown): v is PersistedActive {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as PersistedActive).planId === 'string' &&
    typeof (v as PersistedActive).running === 'boolean'
  );
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PlanContext = createContext<PlanBuilderApi | null>(null);

const DEBOUNCE_MS = 1500;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlanProvider({ children }: { children: ReactNode }) {
  const { configured, isAnonymous, userId } = useAuth();

  const [activePlan, setActivePlan] = useState<PrepPlan | null>(null);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [isBuilding, setIsBuilding] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runnerIndex, setRunnerIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the latest un-flushed save payload while the debounce is pending.
  const pendingSave = useRef<{ plan: PrepPlan; ids: string[]; comp: Set<string> } | null>(null);
  const restoredRef = useRef(false);

  const persistActive = useCallback((planId: string | null, running: boolean) => {
    if (!planId) {
      removeStorageValue(STORAGE_KEYS.PREP_PLAN_ACTIVE);
      return;
    }
    writeStorageJson(STORAGE_KEYS.PREP_PLAN_ACTIVE, { planId, running } satisfies PersistedActive);
  }, []);

  const doSave = useCallback(async (plan: PrepPlan, ids: string[], comp: Set<string>) => {
    setSaving(true);
    try {
      const updated = await updatePrepPlan(plan.id, {
        title: plan.title,
        notes: plan.notes,
        itemIds: ids,
        completedItems: [...comp],
      });
      if (updated) setActivePlan(updated);
    } finally {
      setSaving(false);
      pendingSave.current = null;
    }
  }, []);

  const scheduleSave = useCallback(
    (plan: PrepPlan, ids: string[], comp: Set<string>) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      pendingSave.current = { plan, ids, comp };
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        doSave(plan, ids, comp);
      }, DEBOUNCE_MS);
    },
    [doSave],
  );

  /** Flush any pending debounced save immediately. */
  const flushSave = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    const pending = pendingSave.current;
    if (pending) {
      pendingSave.current = null;
      await doSave(pending.plan, pending.ids, pending.comp);
    }
  }, [doSave]);

  const applyLoadedPlan = useCallback((plan: PrepPlan, running: boolean) => {
    setActivePlan(plan);
    setItemIds(plan.items.map((it) => it.itemId));
    setCompleted(new Set(plan.items.filter((it) => it.completed).map((it) => it.itemId)));
    setIsBuilding(true);
    setIsRunning(running && plan.items.length > 0);
    setRunnerIndex(0);
  }, []);

  const loadPlan = useCallback(
    async (planId: string): Promise<PrepPlan | null> => {
      const plan = await getPrepPlan(planId);
      if (!plan) return null;
      applyLoadedPlan(plan, false);
      persistActive(plan.id, false);
      return plan;
    },
    [applyLoadedPlan, persistActive],
  );

  const closePlan = useCallback(() => {
    void flushSave();
    setActivePlan(null);
    setItemIds([]);
    setCompleted(new Set());
    setIsBuilding(false);
    setIsRunning(false);
    setRunnerIndex(0);
    persistActive(null, false);
  }, [flushSave, persistActive]);

  // Restore a previously-active plan once auth is known and the user is signed in.
  useEffect(() => {
    if (restoredRef.current) return;
    if (!configured || isAnonymous || !userId) return;
    restoredRef.current = true;
    const stored = readStorageJson<PersistedActive | null>(
      STORAGE_KEYS.PREP_PLAN_ACTIVE,
      null,
      (v): v is PersistedActive | null => v === null || isPersistedActive(v),
    );
    if (!stored) return;
    (async () => {
      const plan = await getPrepPlan(stored.planId);
      if (!plan) {
        removeStorageValue(STORAGE_KEYS.PREP_PLAN_ACTIVE);
        return;
      }
      applyLoadedPlan(plan, stored.running);
    })();
  }, [configured, isAnonymous, userId, applyLoadedPlan]);

  // Flush pending edits when the provider unmounts (best-effort).
  useEffect(() => {
    return () => {
      void flushSave();
    };
  }, [flushSave]);

  const addItem = useCallback(
    (itemId: string) => {
      if (!activePlan || !isBuilding) return;
      setItemIds((prev) => {
        if (prev.includes(itemId)) return prev;
        const next = [...prev, itemId];
        scheduleSave(activePlan, next, completed);
        return next;
      });
    },
    [activePlan, isBuilding, completed, scheduleSave],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      if (!activePlan) return;
      const nextCompleted = new Set(completed);
      nextCompleted.delete(itemId);
      setCompleted(nextCompleted);
      setItemIds((prev) => {
        const next = prev.filter((id) => id !== itemId);
        scheduleSave(activePlan, next, nextCompleted);
        return next;
      });
    },
    [activePlan, completed, scheduleSave],
  );

  const reorderItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!activePlan) return;
      setItemIds((prev) => {
        if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length)
          return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        scheduleSave(activePlan, next, completed);
        return next;
      });
    },
    [activePlan, completed, scheduleSave],
  );

  const toggleComplete = useCallback(
    (itemId: string) => {
      if (!activePlan) return;
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        scheduleSave(activePlan, itemIds, next);
        return next;
      });
    },
    [activePlan, itemIds, scheduleSave],
  );

  const renamePlan = useCallback(
    (title: string) => {
      const trimmed = title.trim();
      if (!activePlan || !trimmed || trimmed === activePlan.title) return;
      const nextPlan = { ...activePlan, title: trimmed };
      setActivePlan(nextPlan);
      scheduleSave(nextPlan, itemIds, completed);
    },
    [activePlan, itemIds, completed, scheduleSave],
  );

  const save = useCallback(async () => {
    if (!activePlan) return;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    pendingSave.current = null;
    await doSave(activePlan, itemIds, completed);
  }, [activePlan, itemIds, completed, doSave]);

  const startRun = useCallback(
    (index = 0) => {
      setRunnerIndex(Math.max(0, index));
      setIsRunning(true);
      if (activePlan) persistActive(activePlan.id, true);
    },
    [activePlan, persistActive],
  );

  const stopRun = useCallback(() => {
    setIsRunning(false);
    if (activePlan) persistActive(activePlan.id, false);
  }, [activePlan, persistActive]);

  const nextItem = useCallback(() => {
    setRunnerIndex((i) => Math.min(i + 1, itemIds.length - 1));
  }, [itemIds.length]);

  const prevItem = useCallback(() => {
    setRunnerIndex((i) => Math.max(i - 1, 0));
  }, []);

  const hasItem = useCallback((itemId: string) => itemIds.includes(itemId), [itemIds]);

  const value: PlanBuilderApi = {
    activePlan,
    itemIds,
    completed,
    isBuilding,
    isRunning,
    runnerIndex,
    loadPlan,
    closePlan,
    addItem,
    removeItem,
    reorderItem,
    toggleComplete,
    renamePlan,
    save,
    saving,
    startRun,
    stopRun,
    nextItem,
    prevItem,
    hasItem,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanBuilderApi {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within a PlanProvider');
  return ctx;
}
