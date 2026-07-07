import { arcadeFetch } from './arcadeClient';
import type { Profile } from './types';

export async function getProfile(id: string): Promise<Profile | null> {
  return arcadeFetch<Profile>(`/api/profiles/${id}`, { auth: false });
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, 'display_name' | 'avatar_seed' | 'is_anonymous'>>,
): Promise<Profile | null> {
  void id;
  return arcadeFetch<Profile>('/api/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
