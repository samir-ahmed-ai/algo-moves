import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, LogOut, Shield, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatAuthError } from './formatAuthError';
import { authStrings as s } from './strings';
import { useAuth } from './AuthProvider';

type AuthTab = 'login' | 'signup';

export function AuthPopover({
  open,
  onOpenChange,
  initialTab = 'login',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: AuthTab;
}) {
  const { signInEmail, signUpEmail } = useAuth();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const emailId = useId();
  const nameId = useId();
  const passwordId = useId();

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError(null);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusTarget = panelRef.current?.querySelector<HTMLElement>('input:not([type="hidden"])');
    focusTarget?.focus();
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const result =
        tab === 'login'
          ? await signInEmail(email.trim(), password)
          : await signUpEmail(email.trim(), password, displayName.trim());
      if (result.error) {
        setError(formatAuthError(result.error));
        return;
      }
      onOpenChange(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[min(20vh,8rem)] backdrop-blur-sm sm:items-center sm:pt-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={tab === 'login' ? s.logIn : s.signUp}
        className="w-full max-w-sm rounded-2xl border border-edge bg-bg p-5 shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">{tab === 'login' ? s.welcomeBack : s.createAccount}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink3 hover:bg-panel2 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-edge bg-panel2 p-1">
          <TabChip active={tab === 'login'} onClick={() => { setTab('login'); setError(null); }}>
            {s.logIn}
          </TabChip>
          <TabChip active={tab === 'signup'} onClick={() => { setTab('signup'); setError(null); }}>
            {s.signUp}
          </TabChip>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {tab === 'signup' ? (
            <AuthField
              id={nameId}
              label={s.displayName}
              value={displayName}
              onChange={setDisplayName}
              placeholder={s.namePlaceholder}
              autoComplete="name"
            />
          ) : null}
          <AuthField
            id={emailId}
            label={s.email}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={s.emailPlaceholder}
            autoComplete="email"
            required
          />
          <AuthField
            id={passwordId}
            label={s.password}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={tab === 'signup' ? s.passwordSignupPlaceholder : s.passwordLoginPlaceholder}
            autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            required
          />

          {error ? (
            <p className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !email.trim() || password.length < (tab === 'signup' ? 8 : 1)}
            className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tab === 'login' ? s.logIn : s.createAccountCta}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink3">
          {tab === 'login' ? s.noAccount : s.hasAccount}{' '}
          <button
            type="button"
            className="font-semibold text-accent hover:underline"
            onClick={() => {
              setTab(tab === 'login' ? 'signup' : 'login');
              setError(null);
            }}
          >
            {tab === 'login' ? s.signUp : s.logIn}
          </button>
        </p>
      </div>
    </div>
  );
}

function TabChip({
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
        'min-h-9 rounded-lg text-sm font-semibold transition-colors',
        active ? 'bg-panel text-ink shadow-sm' : 'text-ink3 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  id?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-start" htmlFor={id}>
      <span className="text-xs font-semibold uppercase tracking-wide text-ink3">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="min-h-11 rounded-xl border border-edge bg-panel px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}

export function AuthUserMenu({
  open,
  onClose,
  anchorRef,
  onOpenProfile,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onOpenProfile?: () => void;
}) {
  const { profile, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !profile) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Account menu"
      className="absolute end-0 top-full z-50 mt-1.5 min-w-[12rem] rounded-xl border border-edge bg-panel p-1.5 shadow-[var(--shadow-lg)]"
    >
      <div className="border-b border-edge px-2.5 py-2">
        <p className="truncate text-sm font-semibold text-ink">{profile.display_name}</p>
        {profile.email ? <p className="truncate text-xs text-ink3">{profile.email}</p> : null}
        {profile.is_admin ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            <Shield className="h-3 w-3" /> {s.admin}
          </span>
        ) : null}
      </div>
      {onOpenProfile ? (
        <MenuRow onClick={() => { onOpenProfile(); onClose(); }}>{s.profileStats}</MenuRow>
      ) : null}
      <MenuRow
        danger
        onClick={() => {
          void signOut();
          onClose();
        }}
      >
        <LogOut className="h-3.5 w-3.5" /> {s.signOut}
      </MenuRow>
    </div>
  );
}

function MenuRow({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full min-h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors hover:bg-panel2',
        danger ? 'text-bad' : 'text-ink2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
