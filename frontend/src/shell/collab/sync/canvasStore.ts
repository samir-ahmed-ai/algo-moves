import { arcadeFetch } from '@/platform/api/arcadeClient';

export interface SavedCanvasSummary {
  id: string;
  title: string;
  roomCode: string | null;
  updatedAt: string;
}

export interface SavedCanvas extends SavedCanvasSummary {
  doc: unknown;
  ownerProfileId: string | null;
}

interface CanvasListRow {
  id: string;
  title: string;
  room_code: string | null;
  updated_at: string;
}

export async function createCanvas(
  title: string,
  doc: unknown,
  roomCode?: string,
): Promise<{ id: string; title: string; updatedAt: string } | null> {
  return arcadeFetch<{ id: string; title: string; updatedAt: string }>('/api/canvases', {
    method: 'POST',
    body: JSON.stringify({ title, doc, roomCode }),
  });
}

export async function fetchCanvas(id: string): Promise<SavedCanvas | null> {
  return arcadeFetch<SavedCanvas>(`/api/canvases/${id}`);
}

export async function updateCanvas(
  id: string,
  doc: unknown,
  patch?: { title?: string; roomCode?: string },
): Promise<{ id: string; updatedAt: string } | null> {
  return arcadeFetch<{ id: string; updatedAt: string }>(`/api/canvases/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ doc, ...patch }),
  });
}

export async function listCanvases(): Promise<SavedCanvasSummary[]> {
  const rows = await arcadeFetch<CanvasListRow[]>('/api/canvases');
  if (!rows) return [];
  return rows.map((r: CanvasListRow) => ({
    id: r.id,
    title: r.title,
    roomCode: r.room_code,
    updatedAt: r.updated_at,
  }));
}

export async function deleteCanvas(id: string): Promise<boolean> {
  const res = await arcadeFetch<{ ok: true }>(`/api/canvases/${id}`, { method: 'DELETE' });
  return res?.ok === true;
}
