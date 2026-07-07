import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  BookMarked,
  Check,
  FileText,
  LayoutTemplate,
  Loader2,
  LogOut,
  Pencil,
  Shield,
  Shuffle,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { Avatar } from '@/design/components';
import { useAuth } from '@/shell/auth/AuthProvider';
import { ProductAuthGate } from '@/shell/auth/ProductAuthGate';
import { InterviewToolkitGrid } from '@/shell/interview/InterviewToolkitGrid';
import { useInterviewToolkitNavigation } from '@/shell/interview/useInterviewToolkitNavigation';
import { ProfileIntegrationsSection } from '@/shell/settings/ProfileIntegrationsSection';
import { PageHeader } from '@/shell/chrome/PageHeader';
import { useWorkspace } from '@/store/workspace';

/** Purely cosmetic XP-per-level constant for the profile progress bar. */
const XP_PER_LEVEL = 250;

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatMemberSince(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// ─── Sign-in gate ──────────────────────────────────────────────────────────────

function SignInGate() {
  return (
    <ProductAuthGate
      variant="profile"
      icon={<User className="h-6 w-6" strokeWidth={1.5} />}
      eyebrow="Your account"
      title="One profile for your whole prep journey."
      lede="Sign in to unlock your Interview Canvas, prep Plans, and Resume studio — with progress, stats, and integrations that sync across devices."
      features={[
        { icon: <LayoutTemplate className="h-4 w-4" />, label: 'Interview Canvas + code studio' },
        { icon: <BookMarked className="h-4 w-4" />, label: 'Named prep plans that persist' },
        { icon: <FileText className="h-4 w-4" />, label: 'AI-tailored resume versions' },
      ]}
      preview={
        <>
          <div className="product-auth-gate__preview-top">
            <span>Your profile</span>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="product-auth-gate__progress">
            <span style={{ width: '64%' }} />
          </div>
          <div className="product-auth-gate__mini-list">
            <span>Interview Canvas</span>
            <span>Prep Plans</span>
            <span>Resume studio</span>
          </div>
        </>
      }
    />
  );
}

// ─── Identity card ─────────────────────────────────────────────────────────────

function IdentityCard() {
  const { profile, updateMyProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [shuffling, setShuffling] = useState(false);

  if (!profile) return null;

  const memberSince = formatMemberSince(profile.created_at);
  const xpIntoLevel = ((profile.xp % XP_PER_LEVEL) + XP_PER_LEVEL) % XP_PER_LEVEL;
  const levelPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);

  const startEdit = () => {
    setNameDraft(profile.display_name);
    setEditing(true);
  };

  const saveName = async () => {
    const next = nameDraft.trim();
    if (!next || next === profile.display_name) {
      setEditing(false);
      return;
    }
    setSavingName(true);
    await updateMyProfile({ display_name: next });
    setSavingName(false);
    setEditing(false);
  };

  const shuffleAvatar = async () => {
    setShuffling(true);
    await updateMyProfile({ avatar_seed: randomSeed() });
    setShuffling(false);
  };

  const stats: { label: string; value: string; icon: LucideIcon }[] = [
    { label: 'Level', value: String(profile.level ?? 1), icon: Zap },
    { label: 'Total XP', value: `${profile.xp ?? 0}`, icon: Sparkles },
    ...(memberSince ? [{ label: 'Member since', value: memberSince, icon: User } as const] : []),
  ];

  return (
    <section
      className="profile-identity relative overflow-hidden rounded-3xl border border-edge bg-panel/70 p-5 shadow-theme-md sm:p-6"
      aria-label="Account identity"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_srgb,var(--accent)_30%,transparent),transparent_60%)] opacity-70"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <Avatar
            seed={profile.avatar_seed}
            name={profile.display_name}
            size={84}
            ring="color-mix(in srgb, var(--accent) 45%, transparent)"
          />
          <button
            type="button"
            onClick={shuffleAvatar}
            disabled={shuffling}
            title="Shuffle avatar"
            aria-label="Shuffle avatar"
            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-edge bg-panel text-ink3 shadow-theme-sm transition hover:border-accent/50 hover:text-ink disabled:opacity-50"
          >
            {shuffling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveName();
                  if (e.key === 'Escape') setEditing(false);
                }}
                autoFocus
                maxLength={60}
                aria-label="Display name"
                className="min-w-0 flex-1 rounded-xl border border-edge bg-panel2 px-3 py-1.5 text-lg font-bold text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={savingName}
                className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm transition hover:opacity-90 disabled:opacity-50"
                aria-label="Save name"
              >
                {savingName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-edge text-ink3 transition hover:bg-panel2 hover:text-ink"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-ink">
                {profile.display_name}
              </h1>
              <button
                type="button"
                onClick={startEdit}
                title="Edit display name"
                aria-label="Edit display name"
                className="grid h-7 w-7 place-items-center rounded-lg border border-edge text-ink3 transition hover:border-accent/50 hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {profile.is_admin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[length:var(--fs-2xs)] font-bold uppercase tracking-wide text-accent">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              ) : null}
            </div>
          )}

          {profile.email ? (
            <p className={cn('mt-1 truncate text-ink3', chromeText.sm)}>{profile.email}</p>
          ) : null}

          <div className="mt-3 max-w-sm">
            <div className="mb-1 flex items-center justify-between text-[length:var(--fs-2xs)] font-medium uppercase tracking-[0.12em] text-ink3">
              <span>Level {profile.level ?? 1}</span>
              <span>
                {xpIntoLevel} / {XP_PER_LEVEL} XP
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-panel2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-[color-mix(in_srgb,var(--accent)_55%,#a855f7)] transition-all"
                style={{ width: `${levelPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-edge bg-panel/60 px-3 py-2.5 shadow-theme-sm"
            >
              <div className="flex items-center gap-1.5 text-ink3">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.1em]">
                  {stat.label}
                </span>
              </div>
              <div className="mt-1 truncate text-lg font-bold text-ink">{stat.value}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function ProfileSection({
  eyebrow,
  title,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-accent/10 text-accent shadow-theme-sm">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <span className="block text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-ink3">
            {eyebrow}
          </span>
          <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { configured, isAnonymous, loading, profile, signOut } = useAuth();
  const { goHome } = useWorkspace();
  const openTool = useInterviewToolkitNavigation();
  const [signingOut, setSigningOut] = useState(false);

  const needsAuth = !configured || isAnonymous;

  useEffect(() => {
    document.title = 'Profile · Algo Moves';
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    goHome();
  }, [signOut, goHome]);

  return (
    <div
      className="relative isolate flex h-full flex-col overflow-hidden bg-bg"
      data-surface="profile"
      aria-label="Your profile"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_0%,color-mix(in_srgb,var(--accent)_24%,transparent),transparent_28rem),radial-gradient(circle_at_88%_18%,rgba(248,214,121,0.12),transparent_24rem)]"
      />

      <PageHeader
        onBack={goHome}
        backLabel="Back to home"
        icon={<User />}
        eyebrow="account & interview toolkit"
        title="Your Profile"
      />

      <main className="flex flex-1 flex-col overflow-auto">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-3xl border border-edge bg-panel/80 shadow-theme-md">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
            <p className="text-sm font-medium text-ink2">Loading your profile…</p>
          </div>
        ) : needsAuth || !profile ? (
          <SignInGate />
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
            <IdentityCard />

            <ProfileSection eyebrow="jump back in" title="Interview toolkit" icon={Sparkles}>
              <InterviewToolkitGrid onSelect={openTool} showLabel={false} />
            </ProfileSection>

            <ProfileSection eyebrow="secure integration" title="Integrations" icon={Zap}>
              <ProfileIntegrationsSection />
            </ProfileSection>

            <ProfileSection eyebrow="account" title="Session" icon={LogOut}>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center gap-2 rounded-2xl border border-edge bg-panel/70 px-4 py-2.5 text-sm font-semibold text-bad shadow-theme-sm transition hover:border-bad/40 hover:bg-badbg disabled:opacity-50"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sign out
              </button>
            </ProfileSection>
          </div>
        )}
      </main>
    </div>
  );
}
