/** Shared API types mirroring the backend Postgres schema. */

export interface Profile {
  id: string;
  display_name: string;
  avatar_seed: string;
  personal_room_code?: string;
  email?: string;
  is_admin?: boolean;
  is_anonymous: boolean;
  xp: number;
  level: number;
  created_at: string;
  updated_at: string;
}
