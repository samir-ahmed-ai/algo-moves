import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
      className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ws-scroll flex h-full w-full max-w-md flex-col overflow-y-auto border-s border-edge bg-bg shadow-[var(--shadow-xl)] [padding-top:env(safe-area-inset-top)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t.profile.title}
      >
        <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-edge bg-bg/90 px-3 py-2 backdrop-blur">
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
            className="ms-auto grid h-10 w-10 place-items-center rounded-md text-ink3 hover:bg-panel2 hover:text-ink"
            aria-label={t.header.close}
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 p-4">{tab === 'profile' ? <ProfileTab /> : <LeaderboardTab />}</div>
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
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold',
        active ? 'bg-panel2 text-ink' : 'text-ink3 hover:text-ink',
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

  if (authLoading) return <p className="py-6 text-center text-sm text-ink3">…</p>;

  if (!configured) {
    const displayName = localName || t.profile.guest;
    const myRows = getLocalHistory().filter((row) => row.myName === displayName);
    const totalWins = myRows.filter((row) => row.placement === 1).length;
    const totalLosses = myRows.filter((row) => row.placement !== 1).length;

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Avatar seed={displayName} name={displayName} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-ink">{displayName}</p>
            <p className="text-xs text-ink3">{t.profile.signInHint}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
            {t.profile.stats}
          </p>
          {myRows.length === 0 ? (
            <p className="text-sm text-ink3">{t.profile.noStats}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <StatCell label={t.profile.wins} value={totalWins} tone="good" />
              <StatCell label={t.profile.losses} value={totalLosses} tone="bad" />
              <StatCell label={t.profile.played} value={myRows.length} tone="accent" />
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
            {t.profile.history}
          </p>
          {localHistory.length === 0 ? (
            <p className="text-sm text-ink3">{t.profile.noHistory}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {localHistory.map((h) => {
                const game = GAMES.find((g) => g.id === h.gameId);
                const won = h.placement === 1;
                return (
                  <li key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink2">
                      {game ? localizedGameMeta(game, locale).title : h.gameId}
                    </span>
                    <span className={won ? 'font-semibold text-good' : 'text-ink3'}>
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
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Avatar seed={profile?.avatar_seed ?? name} name={name} size={56} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value.slice(0, 24))}
                className="min-h-9 flex-1 rounded-md border border-edge bg-panel px-2 text-sm text-ink outline-none focus:border-accent"
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
              className="group inline-flex items-center gap-1.5 text-lg font-bold text-ink"
            >
              {name}
              <Pencil className="h-3.5 w-3.5 text-ink3 group-hover:text-ink" />
            </button>
          )}
          <p className="text-xs text-ink3">
            {t.profile.level(profile?.level ?? 1)} · {profile?.xp ?? 0} XP
          </p>
          {profile?.email ? <p className="truncate text-xs text-ink3">{profile.email}</p> : null}
          {profile?.is_admin ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[length:var(--fs-2xs)] font-bold uppercase tracking-wide text-accent">
              <Shield className="h-3 w-3" /> Admin
            </span>
          ) : null}
        </div>
      </div>

      {/* Sign-in / upgrade for anonymous guests */}
      {isAnonymous ? (
        <div className="rounded-[var(--radius)] border border-edge bg-panel/60 p-3">
          <p className="text-sm text-ink3">{t.profile.guestHint}</p>
          <button
            ref={authBtnRef}
            type="button"
            aria-expanded={authOpen}
            aria-haspopup="dialog"
            onClick={() => setAuthOpen((open) => !open)}
            className={cn(
              'mt-3 inline-flex min-h-9 items-center rounded-xl bg-accent px-3 text-sm font-semibold text-white transition-all hover:opacity-90',
              authOpen && 'ring-2 ring-accent/30 ring-offset-2 ring-offset-bg',
            )}
          >
            {t.profile.signIn}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 ms-3 inline-flex min-h-9 items-center gap-1.5 text-xs text-ink3 hover:text-bad"
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
          className="inline-flex min-h-9 items-center gap-1.5 self-start text-xs text-ink3 hover:text-bad"
        >
          <LogOut className="h-3.5 w-3.5" /> {t.profile.signOut}
        </button>
      )}

      {/* Aggregate stats */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
          {t.profile.stats}
        </p>
        {stats.length === 0 ? (
          <p className="text-sm text-ink3">{t.profile.noStats}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <StatCell label={t.profile.wins} value={totalWins} tone="good" />
            <StatCell label={t.profile.losses} value={totalLosses} tone="bad" />
            <StatCell label={t.profile.streak} value={bestStreak} tone="accent" />
          </div>
        )}
      </div>

      {stats.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {stats.map((s) => {
            const game = GAMES.find((g) => g.id === s.game_id);
            return (
              <li
                key={s.game_id}
                className="flex items-center justify-between rounded-md border border-edge bg-panel/50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink">
                  {game ? localizedGameMeta(game, locale).title : s.game_id}
                </span>
                <span className="text-ink3">
                  {s.mmr} · {s.wins}-{s.losses}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Achievements */}
      {achievements.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
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
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
                    has
                      ? 'border-good/50 bg-good/10 text-good'
                      : 'border-edge bg-panel2 text-ink3 opacity-60',
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
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
          {t.profile.history}
        </p>
        {history.length === 0 ? (
          <p className="text-sm text-ink3">{t.profile.noHistory}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {history.map((h) => {
              const game = GAMES.find((g) => g.id === h.match.game_id);
              const won = h.placement === 1;
              return (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink2">
                    {game ? localizedGameMeta(game, locale).title : h.match.game_id}
                  </span>
                  <span className={won ? 'font-semibold text-good' : 'text-ink3'}>
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
    <div className="rounded-[var(--radius)] border border-edge bg-panel/60 p-3 text-center">
      <div
        className={cn(
          'text-2xl font-bold tabular-nums',
          tone === 'good' && 'text-good',
          tone === 'bad' && 'text-bad',
          tone === 'accent' && 'text-accent',
        )}
      >
        {value}
      </div>
      <div className="text-[length:var(--fs-tight)] uppercase tracking-wide text-ink3">{label}</div>
    </div>
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

  if (authLoading) return <p className="py-6 text-center text-sm text-ink3">…</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-[var(--radius)] border border-edge bg-panel2 p-1 text-sm">
        {(['all', 'week', 'today'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              'min-h-9 flex-1 rounded-[calc(var(--radius)-2px)] font-semibold',
              period === p ? 'bg-panel text-ink shadow-sm' : 'text-ink3',
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

      <div className="flex flex-wrap gap-1.5">
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
        <p className="py-6 text-center text-sm text-ink3">…</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink3">{t.leaderboard.empty}</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rows.map((r) => (
            <li
              key={r.profile_id}
              className="flex items-center gap-3 rounded-md border border-edge bg-panel/50 px-3 py-2"
            >
              <span className="w-6 text-center text-sm font-bold tabular-nums text-ink3">
                {r.rank}
              </span>
              <Avatar seed={r.avatar_seed ?? r.profile_id} name={r.display_name} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                {r.display_name}
              </span>
              <span className="text-sm font-semibold tabular-nums text-accent">
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
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium',
        active
          ? 'border-accent bg-accentbg text-accent'
          : 'border-edge bg-panel text-ink3 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
