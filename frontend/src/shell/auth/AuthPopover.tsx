import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Shield,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BrandLogo } from '@/shell/BrandLogo';
import { useWorkspaceNavigation } from '@/store/workspace';
import { InterviewToolkitGrid } from '@/shell/interview/InterviewToolkitGrid';
import { formatAuthError } from './formatAuthError';
import { authStrings as s } from './strings';
import { useAuth } from './AuthProvider';

type AuthTab = 'login' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_BREAKPOINT = 640;
const POPOVER_GAP = 8;
const VIEWPORT_MARGIN = 16;

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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}

function computeAnchoredStyle(
  anchor: HTMLElement,
  panel: HTMLElement,
): Pick<CSSProperties, 'top' | 'right'> {
  const rect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let top = rect.bottom + POPOVER_GAP;
  if (top + panelRect.height > viewportH - VIEWPORT_MARGIN) {
    top = Math.max(VIEWPORT_MARGIN, rect.top - POPOVER_GAP - panelRect.height);
  }

  let right = viewportW - rect.right;
  const leftEdge = viewportW - right - panelRect.width;
  if (leftEdge < VIEWPORT_MARGIN) {
    right = viewportW - VIEWPORT_MARGIN - panelRect.width;
  }
  right = Math.max(VIEWPORT_MARGIN, right);

  return { top, right };
}

export function AuthPopover({
  open,
  onOpenChange,
  initialTab = 'login',
  anchorRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: AuthTab;
  anchorRef?: RefObject<HTMLElement | null>;
}) {
  const { signInEmail, signUpEmail } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anchoredStyle, setAnchoredStyle] = useState<Pick<CSSProperties, 'top' | 'right'> | null>(
    null,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const emailId = useId();
  const nameId = useId();
  const passwordId = useId();
  const errorId = useId();

  const useAnchoredPopover = Boolean(anchorRef?.current) && !isMobile;
  const useSheetLayout = isMobile || !anchorRef?.current;

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

  useLayoutEffect(() => {
    if (!open || !useAnchoredPopover || !anchorRef?.current || !panelRef.current) {
      setAnchoredStyle(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      setAnchoredStyle(computeAnchoredStyle(anchor, panel));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, useAnchoredPopover, anchorRef, tab]);

  useEffect(() => {
    if (!open || !useAnchoredPopover) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef?.current?.contains(t)) return;
      onOpenChange(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, useAnchoredPopover, anchorRef, onOpenChange]);

  useEffect(() => {
    if (!open || !useSheetLayout) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, useSheetLayout]);

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

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={useSheetLayout ? 'true' : 'false'}
      aria-labelledby={titleId}
      {...(error ? { 'aria-describedby': errorId } : {})}
      style={useAnchoredPopover && anchoredStyle ? anchoredStyle : undefined}
      className={cn(
        'auth-popover-panel relative w-full max-w-[22rem] overflow-hidden border border-edge bg-[var(--surface-glass)] shadow-theme-xl ring-1 ring-accent/10 backdrop-blur-xl',
        useAnchoredPopover
          ? cn(
              'fixed z-[60] animate-auth-popover-in rounded-[1.15rem]',
              !anchoredStyle && 'invisible',
            )
          : cn(
              'animate-auth-in',
              useSheetLayout
                ? 'auth-popover-panel--sheet max-w-none rounded-t-[1.25rem] [padding-bottom:max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-[22rem] sm:rounded-[1.25rem]'
                : 'rounded-[1.25rem]',
            ),
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        aria-hidden
        className="auth-modal-glow pointer-events-none absolute inset-x-0 top-0 h-24"
      />

      <div className="auth-popover-panel__inner relative px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="auth-popover-panel__close absolute end-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
          aria-label={s.close}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="auth-popover-panel__hero mb-3 flex flex-col items-center text-center">
          <BrandLogo className="auth-popover-panel__brand h-8 w-8 ring-2 ring-accent/15 ring-offset-2 ring-offset-bg" />
          <h2
            id={titleId}
            className="auth-popover-panel__title mt-2 text-base font-bold tracking-tight text-ink"
          >
            {tab === 'login' ? s.welcomeBack : s.createAccount}
          </h2>
          <p className="auth-popover-panel__subtitle mt-0.5 max-w-[16rem] text-[length:var(--fs-sm)] leading-snug text-ink3">
            {tab === 'login' ? s.loginSubtitle : s.signupSubtitle}
          </p>
        </div>

        <AuthTabList tab={tab} onSwitch={switchTab} />

        <form
          className="flex flex-col gap-2"
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
              leading={<User className="h-4 w-4" />}
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
            {...(emailInvalid ? { error: s.invalidEmail } : {})}
            leading={<Mail className="h-4 w-4" />}
          />

          <AuthField
            id={passwordId}
            label={s.password}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder={
              tab === 'signup' ? s.passwordSignupPlaceholder : s.passwordLoginPlaceholder
            }
            autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
            required
            leading={<Lock className="h-4 w-4" />}
            trailing={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="auth-field__reveal grid h-8 w-8 place-items-center rounded-lg text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
                aria-label={showPassword ? s.hidePassword : s.showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            footer={
              tab === 'signup' && strength ? <PasswordStrengthMeter strength={strength} /> : null
            }
          />

          {error ? (
            <p
              id={errorId}
              role="alert"
              aria-live="assertive"
              className={cn(
                'auth-popover-error flex items-start gap-2 rounded-xl border border-bad/35 bg-badbg px-3 py-2.5 text-sm text-bad',
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
              'auth-popover-submit mt-0.5 inline-flex min-h-[calc(var(--row)*1.35)] w-full items-center justify-center gap-1.5 rounded-full bg-accent px-3 text-sm font-semibold text-[var(--accent-contrast)] shadow-theme-sm',
              'transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow-theme-md active:scale-[0.98] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45',
            )}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tab === 'login' ? s.signingIn : s.creatingAccount}
              </>
            ) : (
              <>
                {tab === 'login' ? s.logIn : s.createAccountCta}
                <ArrowRight className="h-4 w-4 opacity-90" />
              </>
            )}
          </button>
        </form>

        <div className="auth-popover-switch mt-3 border-t border-edge pt-3">
          <p className="text-center text-xs text-ink3">
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

  if (useAnchoredPopover) {
    return panel;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center p-0 animate-auth-backdrop-in',
        useSheetLayout
          ? 'items-end bg-black/40 backdrop-blur-[4px] sm:items-center sm:bg-black/50 sm:p-4 sm:backdrop-blur-[6px]'
          : 'items-center bg-black/50 p-4 backdrop-blur-[6px]',
      )}
      onClick={() => onOpenChange(false)}
    >
      {panel}
    </div>
  );
}

function AuthTabList({ tab, onSwitch }: { tab: AuthTab; onSwitch: (tab: AuthTab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Account mode"
      className="auth-tab-list relative mb-3 grid grid-cols-2 rounded-xl border border-edge bg-panel2 p-[var(--gap)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 start-1 w-[calc(50%-4px)] rounded-lg bg-panel shadow-theme-sm ring-1 ring-edge/80 transition-transform duration-200 ease-out"
        style={{ transform: tab === 'signup' ? 'translateX(calc(100% + 4px))' : 'translateX(0)' }}
      />
      <TabChip active={tab === 'login'} onClick={() => onSwitch('login')}>
        {s.logIn}
      </TabChip>
      <TabChip active={tab === 'signup'} onClick={() => onSwitch('signup')}>
        {s.signUp}
      </TabChip>
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
        'auth-tab-chip relative z-[1] min-h-[var(--row)] rounded-lg text-sm font-semibold transition-colors duration-200',
        active ? 'auth-tab-chip--active text-ink' : 'text-ink3 hover:text-ink2',
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
    <div className="auth-password-strength mt-1.5 space-y-1.5">
      <div className="auth-password-strength__bars flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'auth-password-strength__bar h-1 flex-1 rounded-full transition-colors',
              i < bars ? tone : 'bg-edge/60',
            )}
          />
        ))}
      </div>
      <p className="auth-password-strength__label text-[length:var(--fs-tight)] text-ink3">
        {label}
      </p>
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
  leading,
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
  leading?: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-field flex flex-col gap-1 text-start">
      <label
        className="auth-field__label text-[length:var(--fs-tight)] font-semibold uppercase tracking-wide text-ink3"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="auth-field__control relative">
        {leading ? (
          <div className="auth-field__leading pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink3/80">
            {leading}
          </div>
        ) : null}
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
            'auth-field__input min-h-[calc(var(--row)*1.35)] w-full rounded-xl border bg-panel text-sm text-ink outline-none transition-all',
            'placeholder:text-ink3/70 focus:border-accent focus:ring-2 focus:ring-accent/20',
            leading ? 'ps-10' : 'px-3',
            trailing ? 'pe-11' : leading ? 'pe-3' : undefined,
            invalid ? 'border-bad/50 focus:border-bad focus:ring-bad/15' : 'border-edge',
          )}
        />
        {trailing ? (
          <div className="auth-field__trailing absolute inset-y-0 end-1 flex items-center">
            {trailing}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="auth-field__error text-xs text-bad">
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
  anchorRef: RefObject<HTMLElement | null>;
  onOpenProfile?: () => void;
}) {
  const { profile, signOut } = useAuth();
  const { enterProfile, enterCollabCanvas, enterPlans, enterResumes } = useWorkspaceNavigation();
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

  const openTool = (id: 'interview-canvas' | 'plans' | 'resumes') => {
    if (id === 'interview-canvas') enterCollabCanvas();
    else if (id === 'plans') enterPlans();
    else enterResumes();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Account menu"
      className="auth-user-menu absolute end-0 top-full z-50 mt-1.5 w-[min(18.5rem,calc(100vw-2rem))] animate-auth-popover-in rounded-2xl border border-edge bg-[var(--surface-glass)] p-1.5 shadow-theme-xl backdrop-blur-xl"
    >
      <div className="auth-user-menu__head border-b border-edge px-2.5 py-2">
        <p className="auth-user-menu__name truncate text-sm font-semibold text-ink">
          {profile.display_name}
        </p>
        {profile.email ? (
          <p className="auth-user-menu__email truncate text-xs text-ink3">{profile.email}</p>
        ) : null}
        {profile.is_admin ? (
          <span className="auth-user-menu__admin mt-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[length:var(--fs-2xs)] font-bold uppercase tracking-wide text-accent">
            <Shield className="h-3 w-3" /> {s.admin}
          </span>
        ) : null}
      </div>

      <div className="border-b border-edge px-2 py-2.5">
        <InterviewToolkitGrid onSelect={openTool} compact />
      </div>

      <MenuRow
        icon={<User className="h-3.5 w-3.5" />}
        onClick={() => {
          enterProfile();
          onClose();
        }}
      >
        {s.profile}
      </MenuRow>
      {onOpenProfile ? (
        <MenuRow
          icon={<Trophy className="h-3.5 w-3.5" />}
          onClick={() => {
            onOpenProfile();
            onClose();
          }}
        >
          {s.profileStats}
        </MenuRow>
      ) : null}
      <MenuRow
        danger
        icon={<LogOut className="h-3.5 w-3.5" />}
        onClick={() => {
          void signOut();
          onClose();
        }}
      >
        {s.signOut}
      </MenuRow>
    </div>
  );
}

function MenuRow({
  children,
  onClick,
  icon,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'auth-user-menu__row flex min-h-9 w-full items-center gap-2 rounded-xl px-2.5 text-sm transition-colors hover:bg-panel2',
        danger ? 'text-bad' : 'text-ink2 hover:text-ink',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
