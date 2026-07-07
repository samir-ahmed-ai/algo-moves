import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X, Trophy, User as UserIcon, Pencil, LogOut, Shield } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getArcadeStrings, useGamesLocale } from '../locale';
import { useAuth } from '@/shell/auth/AuthProvider';
import { AuthPopover } from '@/shell/auth';
import {
  getGameStats,
  getMatchHistory,
  leaderboardGame,
  leaderboardGlobal,
  leaderboardRecent,
  listAchievements,
  listUnlockedAchievementIds,
} from '../data/db';
import {
  buildLocalLeaderboard,
  getLocalHistory,
  type LocalMatchRecord,
} from '../data/localHistory';
import { GAMES } from '../registry';
import { localizedGameMeta } from '../gameMeta';
import { Avatar } from '../ui/Avatar';
import { TouchButton } from '../ui/gamesUi';
import { readStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';
import type { Achievement, GameStats, LeaderboardEntry, MatchHistoryEntry } from '../data/types';

type Tab = 'profile' | 'leaderboard';

/** A slide-over panel with the player's profile/stats and the leaderboards. */
export function ProgressOverlay({ onClose }: { onClose: () => void }) {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const [tab, setTab] = useState<Tab>('profile');
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close on Escape, focus the close button on open, and restore focus to
  // whatever was focused before (the profile button) on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="game-progress-backdrop fixed inset-0 z-40 flex justify-end bg-slate-950/52 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="game-progress-panel ws-scroll flex h-full w-full max-w-md flex-col overflow-y-auto border-s border-white/15 bg-white/86 shadow-[0_30px_120px_rgba(2,6,23,0.38)] backdrop-blur-2xl [padding-top:env(safe-area-inset-top)] dark:bg-slate-950/88"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t.profile.title}
      >
        <header className="game-progress-panel__header sticky top-0 z-10 flex items-center gap-1 border-b border-white/60 bg-white/78 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/78">
          <TabButton
            active={tab === 'profile'}
            onClick={() => setTab('profile')}
            icon={<UserIcon className="h-4 w-4" />}
          >
            {t.profile.title}
          </TabButton>
          <TabButton
            active={tab === 'leaderboard'}
            onClick={() => setTab('leaderboard')}
            icon={<Trophy className="h-4 w-4" />}
          >
            {t.leaderboard.title}
          </TabButton>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="game-progress-panel__close ms-auto grid h-10 w-10 place-items-center rounded-2xl text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t.header.close}
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="game-progress-panel__body flex-1 p-4">
          {tab === 'profile' ? <ProfileTab /> : <LeaderboardTab />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'game-progress-tab inline-flex min-h-10 items-center gap-1.5 rounded-2xl px-3 text-sm font-black transition',
        active
          ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
          : 'text-slate-500 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
        active && 'is-active',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ProfileTab() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const {
    configured,
    loading: authLoading,
    profile,
    isAnonymous,
    userId,
    ensureSignedIn,
    updateMyProfile,
    signOut,
  } = useAuth();
  const [stats, setStats] = useState<GameStats[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [localHistory, setLocalHistory] = useState<LocalMatchRecord[]>([]);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const authBtnRef = useRef<HTMLButtonElement>(null);
  const localName = readStorageText(STORAGE_KEYS.GAMES_NAME, '')?.trim() ?? '';

  const loadLocal = useCallback(() => {
    setLocalHistory(getLocalHistory(10));
  }, []);

  const load = useCallback(async () => {
    loadLocal();
    if (!configured) return;
    const id = await ensureSignedIn();
    if (!id) return;
    const [s, a, u, h] = await Promise.all([
      getGameStats(id),
      listAchievements(),
      listUnlockedAchievementIds(id),
      getMatchHistory(id, 10),
    ]);
    setStats(s);
    setAchievements(a);
    setUnlocked(u);
    setHistory(h);
  }, [configured, ensureSignedIn, loadLocal, userId, isAnonymous]);

  useEffect(() => {
    void load();
  }, [load]);

  if (authLoading) {
    return (
      <p className="py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">…</p>
    );
  }

  if (!configured) {
    const displayName = localName || t.profile.guest;
    const myRows = getLocalHistory().filter((row) => row.myName === displayName);
    const totalWins = myRows.filter((row) => row.placement === 1).length;
    const totalLosses = myRows.filter((row) => row.placement !== 1).length;

    return (
      <div className="game-profile-tab flex flex-col gap-5">
        <div className="game-profile-card flex items-center gap-3 rounded-[1.75rem] border border-white/60 bg-white/72 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <Avatar seed={displayName} name={displayName} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-slate-950 dark:text-white">{displayName}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.profile.signInHint}
            </p>
          </div>
        </div>

        <div className="game-progress-section">
          <p className="game-progress-section__label mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t.profile.stats}
          </p>
          {myRows.length === 0 ? (
            <EmptyState>{t.profile.noStats}</EmptyState>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <StatCell label={t.profile.wins} value={totalWins} tone="good" />
              <StatCell label={t.profile.losses} value={totalLosses} tone="bad" />
              <StatCell label={t.profile.played} value={myRows.length} tone="accent" />
            </div>
          )}
        </div>

        <div className="game-progress-section">
          <p className="game-progress-section__label mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t.profile.history}
          </p>
          {localHistory.length === 0 ? (
            <EmptyState>{t.profile.noHistory}</EmptyState>
          ) : (
            <ul className="flex flex-col gap-1">
              {localHistory.map((h) => {
                const game = GAMES.find((g) => g.id === h.gameId);
                const won = h.placement === 1;
                return (
                  <li
                    key={h.id}
                    className="game-history-row flex items-center justify-between rounded-2xl border border-white/60 bg-white/64 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {game ? localizedGameMeta(game, locale).title : h.gameId}
                    </span>
                    <span
                      className={
                        won
                          ? 'font-black text-emerald-600 dark:text-emerald-200'
                          : 'font-semibold text-slate-500 dark:text-slate-400'
                      }
                    >
                      {won ? t.profile.wins : t.profile.losses}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const name = profile?.display_name ?? t.profile.guest;
  const totalWins = stats.reduce((n, s) => n + s.wins, 0);
  const totalLosses = stats.reduce((n, s) => n + s.losses, 0);
  const bestStreak = stats.reduce((n, s) => Math.max(n, s.best_streak), 0);

  return (
    <div className="game-profile-tab flex flex-col gap-5">
      <div className="game-profile-card flex items-center gap-3 rounded-[1.75rem] border border-white/60 bg-white/72 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <Avatar seed={profile?.avatar_seed ?? name} name={name} size={56} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value.slice(0, 24))}
                className="min-h-10 flex-1 rounded-2xl border border-white/60 bg-white/80 px-3 text-sm font-bold text-slate-950 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/25 dark:border-white/10 dark:bg-white/5 dark:text-white"
                autoFocus
              />
              <TouchButton
                variant="primary"
                size="md"
                onClick={async () => {
                  if (nameDraft.trim()) await updateMyProfile({ display_name: nameDraft.trim() });
                  setEditing(false);
                }}
              >
                {t.profile.save}
              </TouchButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(name);
                setEditing(true);
              }}
              className="group inline-flex items-center gap-1.5 text-lg font-black text-slate-950 dark:text-white"
            >
              {name}
              <Pencil className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-950 dark:group-hover:text-white" />
            </button>
          )}
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.profile.level(profile?.level ?? 1)} · {profile?.xp ?? 0} XP
          </p>
          {profile?.email ? (
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {profile.email}
            </p>
          ) : null}
          {profile?.is_admin ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-cyan-300/35 bg-cyan-50/85 px-2 py-0.5 text-[length:var(--fs-2xs)] font-black uppercase tracking-wide text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
              <Shield className="h-3 w-3" /> Admin
            </span>
          ) : null}
        </div>
      </div>

      {/* Sign-in / upgrade for anonymous guests */}
      {isAnonymous ? (
        <div className="game-progress-section rounded-[1.5rem] border border-white/60 bg-white/72 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t.profile.guestHint}
          </p>
          <button
            ref={authBtnRef}
            type="button"
            aria-expanded={authOpen}
            aria-haspopup="dialog"
            onClick={() => setAuthOpen((open) => !open)}
            className={cn(
              'mt-3 inline-flex min-h-9 items-center rounded-2xl bg-slate-950 px-3 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950',
              authOpen &&
                'ring-2 ring-cyan-300/35 ring-offset-2 ring-offset-white dark:ring-offset-slate-950',
            )}
          >
            {t.profile.signIn}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 ms-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-200"
          >
            <LogOut className="h-3.5 w-3.5" /> {t.profile.signOut}
          </button>
          <AuthPopover
            open={authOpen}
            onOpenChange={setAuthOpen}
            initialTab="signup"
            anchorRef={authBtnRef}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-2xl px-2 text-xs font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-200"
        >
          <LogOut className="h-3.5 w-3.5" /> {t.profile.signOut}
        </button>
      )}

      {/* Aggregate stats */}
      <div className="game-progress-section">
        <p className="game-progress-section__label mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {t.profile.stats}
        </p>
        {stats.length === 0 ? (
          <EmptyState>{t.profile.noStats}</EmptyState>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <StatCell label={t.profile.wins} value={totalWins} tone="good" />
            <StatCell label={t.profile.losses} value={totalLosses} tone="bad" />
            <StatCell label={t.profile.streak} value={bestStreak} tone="accent" />
          </div>
        )}
      </div>

      {stats.length > 0 ? (
        <ul className="game-stat-list flex flex-col gap-1.5">
          {stats.map((s) => {
            const game = GAMES.find((g) => g.id === s.game_id);
            return (
              <li
                key={s.game_id}
                className="game-stat-row flex items-center justify-between rounded-2xl border border-white/60 bg-white/64 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {game ? localizedGameMeta(game, locale).title : s.game_id}
                </span>
                <span className="font-mono text-xs font-black text-slate-500 dark:text-slate-400">
                  {s.mmr} · {s.wins}-{s.losses}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Achievements */}
      {achievements.length > 0 ? (
        <div className="game-progress-section">
          <p className="game-progress-section__label mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t.profile.achievements} · {t.profile.unlocked(unlocked.length, achievements.length)}
          </p>
          <div className="flex flex-wrap gap-2">
            {achievements.map((a) => {
              const has = unlocked.includes(a.id);
              return (
                <span
                  key={a.id}
                  title={`${a.title} — ${a.description}`}
                  className={cn(
                    'game-achievement-chip inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold',
                    has
                      ? 'border-emerald-300/45 bg-emerald-100/80 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100'
                      : 'border-white/60 bg-white/64 text-slate-400 opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-slate-500',
                    has && 'is-unlocked',
                  )}
                >
                  {a.title}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Recent matches */}
      <div className="game-progress-section">
        <p className="game-progress-section__label mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {t.profile.history}
        </p>
        {history.length === 0 ? (
          <EmptyState>{t.profile.noHistory}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-1">
            {history.map((h) => {
              const game = GAMES.find((g) => g.id === h.match.game_id);
              const won = h.placement === 1;
              return (
                <li
                  key={h.id}
                  className="game-history-row flex items-center justify-between rounded-2xl border border-white/60 bg-white/64 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {game ? localizedGameMeta(game, locale).title : h.match.game_id}
                  </span>
                  <span
                    className={
                      won
                        ? 'font-black text-emerald-600 dark:text-emerald-200'
                        : 'font-semibold text-slate-500 dark:text-slate-400'
                    }
                  >
                    {won ? t.profile.wins : t.profile.losses}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'good' | 'bad' | 'accent';
}) {
  return (
    <div className="game-stat-cell rounded-[1.35rem] border border-white/60 bg-white/72 p-3 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div
        className={cn(
          'text-2xl font-black tabular-nums',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-200',
          tone === 'bad' && 'text-red-600 dark:text-red-200',
          tone === 'accent' && 'text-cyan-700 dark:text-cyan-200',
        )}
      >
        {value}
      </div>
      <div className="text-[length:var(--fs-tight)] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 bg-white/46 px-3 py-4 text-center text-sm font-semibold text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-400">
      {children}
    </p>
  );
}

type Period = 'all' | 'week' | 'today';

function LeaderboardTab() {
  const { locale } = useGamesLocale();
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const { configured, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>('all');
  const [gameId, setGameId] = useState<string | null>(null);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const run = async () => {
      if (!configured) {
        const since =
          period === 'all'
            ? undefined
            : new Date(Date.now() - (period === 'week' ? 7 : 1) * 86400000);
        const localRows = buildLocalLeaderboard({ gameId, since }).map((row) => ({
          rank: row.rank,
          profile_id: row.name,
          display_name: row.name,
          avatar_seed: row.name,
          level: 1,
          wins: row.wins,
          losses: row.losses,
          matches_played: row.matchesPlayed,
        }));
        if (alive) {
          setRows(localRows);
          setLoading(false);
        }
        return;
      }

      let data: LeaderboardEntry[];
      if (period === 'all') {
        data = gameId ? await leaderboardGame(gameId) : await leaderboardGlobal();
      } else {
        const since = new Date(Date.now() - (period === 'week' ? 7 : 1) * 86400000).toISOString();
        data = await leaderboardRecent(since, gameId);
      }
      if (alive) {
        setRows(data);
        setLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [configured, period, gameId]);

  if (authLoading) {
    return (
      <p className="py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">…</p>
    );
  }

  return (
    <div className="game-leaderboard-tab flex flex-col gap-3">
      <div className="game-leaderboard-period flex gap-1 rounded-2xl border border-white/60 bg-slate-950/5 p-1 text-sm shadow-inner dark:border-white/10 dark:bg-white/5">
        {(['all', 'week', 'today'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              'game-leaderboard-period__button min-h-9 flex-1 rounded-xl font-black transition',
              period === p
                ? 'bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950'
                : 'text-slate-500 hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
              period === p && 'is-active',
            )}
          >
            {p === 'all'
              ? t.leaderboard.allTime
              : p === 'week'
                ? t.leaderboard.thisWeek
                : t.leaderboard.today}
          </button>
        ))}
      </div>

      <div className="game-leaderboard-scopes flex flex-wrap gap-1.5">
        <ScopeChip active={gameId === null} onClick={() => setGameId(null)}>
          {t.leaderboard.global}
        </ScopeChip>
        {GAMES.map((g) => (
          <ScopeChip key={g.id} active={gameId === g.id} onClick={() => setGameId(g.id)}>
            {localizedGameMeta(g, locale).title}
          </ScopeChip>
        ))}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
          …
        </p>
      ) : rows.length === 0 ? (
        <EmptyState>{t.leaderboard.empty}</EmptyState>
      ) : (
        <ol className="game-leaderboard-list flex flex-col gap-1">
          {rows.map((r) => (
            <li
              key={r.profile_id}
              className="game-leaderboard-row flex items-center gap-3 rounded-2xl border border-white/60 bg-white/64 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <span className="w-6 text-center text-sm font-black tabular-nums text-slate-400">
                {r.rank}
              </span>
              <Avatar seed={r.avatar_seed ?? r.profile_id} name={r.display_name} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {r.display_name}
              </span>
              <span className="text-sm font-black tabular-nums text-cyan-700 dark:text-cyan-200">
                {configured ? (r.mmr ?? r.wins ?? r.xp ?? 0) : (r.wins ?? 0)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ScopeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'game-scope-chip rounded-full border px-3 py-1 text-xs font-bold transition',
        active
          ? 'border-cyan-300/45 bg-cyan-50/85 text-cyan-800 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100'
          : 'border-white/60 bg-white/64 text-slate-500 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
        active && 'is-active',
      )}
    >
      {children}
    </button>
  );
}
