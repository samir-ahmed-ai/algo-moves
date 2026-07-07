import { arcadeFetch } from './arcadeClient';
import type { Profile } from './types';

export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'avatar_seed' | 'is_anonymous'>>;

export async function getProfile(id: string): Promise<Profile | null> {
  return arcadeFetch<Profile>(`/api/profiles/${encodeURIComponent(id)}`, { auth: false });
}

export async function updateProfile(id: string, patch: ProfilePatch): Promise<Profile | null> {
  void id;
  return arcadeFetch<Profile>('/api/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
