-- Games catalog: canonical arcade game ids (mirrors frontend registry).
create table if not exists public.games (
  id         text primary key,
  title      text not null,
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.games (id, title, sort_order) values
  ('would-you-rather',     'Would You Rather',     1),
  ('number-duel',          'Number Duel',          2),
  ('tic-tac-toe',          'Tic-Tac-Toe',          3),
  ('rock-paper-scissors',  'Rock Paper Scissors',  4),
  ('mind-meld',            'Mind Meld',            5),
  ('reaction-duel',        'Reaction Duel',        6)
on conflict (id) do nothing;

-- Backfill any daily challenges that predate the catalog.
insert into public.games (id, title, sort_order)
select distinct dc.game_id, dc.game_id, 99
from public.daily_challenges dc
where not exists (select 1 from public.games g where g.id = dc.game_id)
on conflict (id) do nothing;

alter table public.daily_challenges
  drop constraint if exists daily_challenges_game_id_fkey;

alter table public.daily_challenges
  add constraint daily_challenges_game_id_fkey
  foreign key (game_id) references public.games (id);

-- Pick daily game from catalog instead of a hardcoded array.
create or replace function public.get_or_create_daily_challenge(p_date date default current_date)
returns public.daily_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row   public.daily_challenges;
  v_games text[];
  v_idx   int;
begin
  select * into v_row from public.daily_challenges where challenge_date = p_date;
  if found then
    return v_row;
  end if;

  select coalesce(array_agg(id order by sort_order), array[]::text[])
  into v_games
  from public.games
  where active;

  if coalesce(array_length(v_games, 1), 0) = 0 then
    raise exception 'no active games in catalog';
  end if;

  v_idx := (('x' || substr(md5(p_date::text), 1, 8))::bit(32)::bigint % array_length(v_games, 1)) + 1;
  insert into public.daily_challenges (challenge_date, game_id, seed)
  values (p_date, v_games[v_idx], md5(p_date::text))
  on conflict (challenge_date) do nothing;

  select * into v_row from public.daily_challenges where challenge_date = p_date;
  return v_row;
end;
$$;
