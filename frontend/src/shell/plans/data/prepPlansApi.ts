import { arcadeFetch } from '@/shell/games/data/arcadeClient';

export interface PrepPlanItem {
  itemId: string;
  position: number;
  completed: boolean;
}

/** Full plan returned by create/get/update. */
export interface PrepPlan {
  id: string;
  ownerProfileId: string;
  title: string;
  notes: string;
  items: PrepPlanItem[];
  createdAt: string;
  updatedAt: string;
}

/** Lightweight row for list views. */
export interface PrepPlanSummary {
  id: string;
  title: string;
  itemCount: number;
  completedCount: number;
  updatedAt: string;
}

export async function listPrepPlans(): Promise<PrepPlanSummary[]> {
  const rows = await arcadeFetch<PrepPlanSummary[]>('/api/prep-plans');
  return rows ?? [];
}

export async function createPrepPlan(title: string, itemIds?: string[]): Promise<PrepPlan | null> {
  return arcadeFetch<PrepPlan>('/api/prep-plans', {
    method: 'POST',
    body: JSON.stringify({ title, itemIds }),
  });
}

export async function getPrepPlan(id: string): Promise<PrepPlan | null> {
  return arcadeFetch<PrepPlan>(`/api/prep-plans/${id}`);
}

export async function updatePrepPlan(
  id: string,
  patch: {
    title?: string;
    notes?: string;
    itemIds?: string[];
    completedItems?: string[];
  },
): Promise<PrepPlan | null> {
  return arcadeFetch<PrepPlan>(`/api/prep-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function deletePrepPlan(id: string): Promise<boolean> {
  const res = await arcadeFetch<{ ok: boolean }>(`/api/prep-plans/${id}`, {
    method: 'DELETE',
  });
  return res?.ok === true;
}
