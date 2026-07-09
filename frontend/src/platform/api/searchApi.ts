import { arcadeFetch } from './arcadeClient';
import type { ServerSearchHit } from '@/lib/search/types';

export interface SearchApiResponse {
  hits: ServerSearchHit[];
}

/** Full-text search over signed-in user data (plans, resumes, interviews, canvases). */
export async function searchServer(query: string, limit = 20): Promise<ServerSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await arcadeFetch<SearchApiResponse>(`/api/search?${params}`);
  return res?.hits ?? [];
}
