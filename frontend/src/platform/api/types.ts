/** Shared API types mirroring the backend Postgres schema. */

export type ProfileId = string;

export interface Profile {
  id: ProfileId;
  display_name: string;
  avatar_seed: string;
  personal_room_code?: string | undefined;
  email?: string | undefined;
  is_admin?: boolean | undefined;
  is_anonymous: boolean;
  xp: number;
  level: number;
  created_at: string;
  updated_at: string;
}
