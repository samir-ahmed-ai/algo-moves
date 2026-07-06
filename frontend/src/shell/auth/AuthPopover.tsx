import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, LogOut, Shield, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BrandLogo } from '@/shell/BrandLogo';
import { formatAuthError } from './formatAuthError';
import { authStrings as s } from './strings';
import { useAuth } from './AuthProvider';

type AuthTab = 'login' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrength(password: string): 'weak' | 'fair' | 'strong' | null {
  if (!password) return null;
  if (password.length < 8) return 'weak';
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const score = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (score >= 3 && password.length >= 10) return 'strong';
  if (score >= 2) return 'fair';
  return 'weak';
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const emailId = useId();
  const nameId = useId();
  const passwordId = useId();
  const errorId = useId();

  const emailInvalid = emailTouched && email.trim().length > 0 && !EMAIL_RE.test(email.trim());
  const strength = tab === 'signup' ? passwordStrength(password) : null;
  const canSubmit =
    !busy &&
    email.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    password.length >= (tab === 'signup' ? 8 : 1) &&
    (tab === 'login' || displayName.trim().length > 0);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError(null);
      setEmailTouched(false);
      setShowPassword(false);
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
    const panel = panelRef.current;
    if (!panel) return;
    const focusTarget = panel.querySelector<HTMLElement>('input:not([type="hidden"])');
    focusTarget?.focus();

    const focusables = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange, tab]);

  useEffect(() => {
    if (!error) return;
    setShakeError(true);
    const t = window.setTimeout(() => setShakeError(false), 450);
    return () => window.clearTimeout(t);
  }, [error]);

  if (!open) return null;

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setError(null);
    setEmailTouched(false);
  };

  const submit = async () => {
    setEmailTouched(true);
    if (!EMAIL_RE.test(email.trim())) {
      setError(s.invalidEmail);
      return;
    }
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[6px] animate-auth-backdrop-in sm:items-center sm:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'relative w-full max-w-[24rem] overflow-hidden rounded-t-[1.25rem] border border-edge bg-bg shadow-theme-xl animate-auth-in',
          'sm:rounded-[1.25rem]',
          '[padding-bottom:max(1.25rem,env(safe-area-inset-bottom))]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="auth-modal-glow pointer-events-none absolute inset-x-0 top-0 h-28" />

        <div className="relative px-5 pb-5 pt-6 sm:px-6 sm:pt-7">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-xl text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
            aria-label={s.close}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-5 flex flex-col items-center text-center">
            <BrandLogo className="h-11 w-11 ring-2 ring-accent/15 ring-offset-2 ring-offset-bg" />
            <h2 id={titleId} className="mt-3 text-xl font-bold tracking-tight text-ink">
              {tab === 'login' ? s.welcomeBack : s.createAccount}
            </h2>
            <p className="mt-1.5 max-w-[18rem] text-sm leading-snug text-ink3">
              {tab === 'login' ? s.loginSubtitle : s.signupSubtitle}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Account mode"
            className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-edge bg-panel2 p-1"
          >
            <TabChip active={tab === 'login'} onClick={() => switchTab('login')}>
              {s.logIn}
            </TabChip>
            <TabChip active={tab === 'signup'} onClick={() => switchTab('signup')}>
              {s.signUp}
            </TabChip>
          </div>

          <form
            className="flex flex-col gap-3.5"
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
                required
              />
            ) : null}

            <AuthField
              id={emailId}
              label={s.email}
              type="email"
              value={email}
              onChange={setEmail}
              onBlur={() => setEmailTouched(true)}
              placeholder={s.emailPlaceholder}
              autoComplete="email"
              required
              invalid={emailInvalid}
              error={emailInvalid ? s.invalidEmail : undefined}
            />

            <AuthField
              id={passwordId}
              label={s.password}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder={tab === 'signup' ? s.passwordSignupPlaceholder : s.passwordLoginPlaceholder}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              required
              trailing={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
                  aria-label={showPassword ? s.hidePassword : s.showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              footer={
                tab === 'signup' && strength ? (
                  <PasswordStrengthMeter strength={strength} />
                ) : null
              }
            />

            {error ? (
              <p
                id={errorId}
                role="alert"
                aria-live="assertive"
                className={cn(
                  'flex items-start gap-2 rounded-xl border border-bad/35 bg-badbg px-3 py-2.5 text-sm text-bad',
                  shakeError && 'animate-[shake_0.45s_ease-in-out]',
                )}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'mt-0.5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white',
                'shadow-[0_1px_2px_hsl(0_0%_0%/0.12),0_4px_12px_hsl(var(--accent-h,220)_80%_40%/0.25)]',
                'transition-all hover:opacity-95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tab === 'login' ? s.signingIn : s.creatingAccount}
                </>
              ) : tab === 'login' ? (
                s.logIn
              ) : (
                s.createAccountCta
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-ink3">
            {tab === 'login' ? s.noAccount : s.hasAccount}{' '}
            <button
              type="button"
              className="font-semibold text-accent underline-offset-2 transition-colors hover:underline"
              onClick={() => switchTab(tab === 'login' ? 'signup' : 'login')}
            >
              {tab === 'login' ? s.signUp : s.logIn}
            </button>
          </p>
        </div>
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'min-h-10 rounded-lg text-sm font-semibold transition-all duration-200',
        active
          ? 'bg-panel text-ink shadow-theme-sm ring-1 ring-edge/80'
          : 'text-ink3 hover:text-ink2',
      )}
    >
      {children}
    </button>
  );
}

function PasswordStrengthMeter({ strength }: { strength: 'weak' | 'fair' | 'strong' }) {
  const bars = strength === 'weak' ? 1 : strength === 'fair' ? 2 : 4;
  const tone =
    strength === 'weak' ? 'bg-bad' : strength === 'fair' ? 'bg-[var(--edge-active)]' : 'bg-good';
  const label = s.passwordStrength[strength];

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn('h-1 flex-1 rounded-full transition-colors', i < bars ? tone : 'bg-edge/60')}
          />
        ))}
      </div>
      <p className="text-[11px] text-ink3">{label}</p>
    </div>
  );
}

function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  required,
  invalid,
  error,
  trailing,
  footer,
}: {
  id?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  invalid?: boolean;
  error?: string;
  trailing?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-start">
      <label className="text-xs font-semibold uppercase tracking-wide text-ink3" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className={cn(
            'min-h-11 w-full rounded-xl border bg-panel px-3 text-sm text-ink outline-none transition-all',
            'placeholder:text-ink3/70 focus:border-accent focus:ring-2 focus:ring-accent/20',
            trailing ? 'pe-11' : undefined,
            invalid ? 'border-bad/50 focus:border-bad focus:ring-bad/15' : 'border-edge',
          )}
        />
        {trailing ? <div className="absolute inset-y-0 end-1 flex items-center">{trailing}</div> : null}
      </div>
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="text-xs text-bad">
          {error}
        </p>
      ) : null}
      {footer}
    </div>
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
      className="absolute end-0 top-full z-50 mt-1.5 min-w-[12rem] animate-auth-in rounded-xl border border-edge bg-panel p-1.5 shadow-theme-lg"
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
  children: ReactNode;
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
