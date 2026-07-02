# Supabase — Games Arcade persistence

The realtime relay (moves, presence, spectators) runs entirely in the Go server
under `backend/`. Supabase adds **durable** data only: player profiles,
match history, per-game MMR/stats, leaderboards, achievements, persistent
rooms, friends and daily challenges.

The arcade **degrades gracefully**: with no Supabase env set it still runs for
zero-config LAN play — you just don't get profiles/leaderboards/history.

## One-time setup

1. Create a free project at <https://supabase.com>.
2. Enable **Anonymous sign-ins**: Dashboard → Authentication → Providers →
   Anonymous → enable. (Optionally enable Email / a social provider for the
   "keep my stats" account-upgrade flow.)
3. Apply the schema. Either:
   - **SQL editor**: paste the files below in order and run each:
     1. `migrations/20260101000000_arcade_schema.sql`
     2. `migrations/20260101000001_arcade_functions.sql`
     3. `seed.sql`
   - **or Supabase CLI** (from the repo root):
     ```bash
     supabase link --project-ref <your-ref>
     supabase db push          # applies migrations/
     psql "$DATABASE_URL" -f supabase/seed.sql
     ```
4. Copy your project URL and **anon** public key (Settings → API) into the
   frontend env (see `frontend/.env.example`):
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-public-key>
   ```

## Design notes

- **No forged scores.** RLS denies direct writes to `matches`, `match_participants`
  and `game_stats`. All rating/XP changes go through the
  `submit_match_result(...)` `SECURITY DEFINER` RPC, which computes
  placement-based Elo, updates streaks, awards XP and unlocks achievements
  atomically.
- **Profiles auto-provision.** A trigger on `auth.users` creates a `profiles`
  row on sign-in (including anonymous), so a guest can play instantly.
- **Leaderboards** come from `leaderboard_game` / `leaderboard_global` /
  `leaderboard_recent` (day/week windows).
- Only the **anon public** key ships to the browser — never the service-role key.
