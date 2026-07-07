import { useRef, useState } from 'react';
import { Loader2, LogIn, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from './AuthProvider';
import { Avatar } from '@/design/components';
import { authStrings as s } from './strings';
import { AuthPopover, AuthUserMenu } from './AuthPopover';

export function AuthButton({
  onOpenProfile,
  compact,
  variant = 'default',
  className,
}: {
  /** Games arcade: open the progress overlay from the user menu. */
  onOpenProfile?: () => void;
  compact?: boolean;
  /** `header` matches the landing page sticky bar controls. */
  variant?: 'default' | 'header';
  className?: string;
}) {
  const { configured, loading, profile, isAnonymous } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const signInRef = useRef<HTMLButtonElement>(null);

  const isHeader = variant === 'header';

  if (loading && configured) {
    return (
      <span
        className={cn(
          'auth-button-loading inline-grid place-items-center text-ink3',
          isHeader ? 'h-8 w-8' : 'h-9 w-9',
          className,
        )}
        aria-hidden
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  const signedIn = configured && profile && !isAnonymous;

  if (signedIn) {
    return (
      <div className={cn('auth-button-wrap relative', className)}>
        <button
          ref={anchorRef}
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            'auth-button auth-button--user inline-flex items-center gap-2 border border-edge bg-panel2 px-2 text-ink3 transition-all hover:bg-panel hover:text-ink touch-manipulation',
            isHeader ? 'min-h-0 rounded-md py-1.5' : 'min-h-9 rounded-xl',
            menuOpen && 'auth-button--open border-accent/40 ring-2 ring-accent/15',
            compact || isHeader ? 'max-w-[8rem]' : 'max-w-[10rem]',
          )}
          title={profile.display_name}
        >
          <Avatar
            seed={profile.avatar_seed}
            name={profile.display_name}
            size={isHeader ? 20 : 24}
          />
          {!compact && !isHeader ? (
            <span className="truncate text-sm font-semibold text-ink">{profile.display_name}</span>
          ) : null}
          {isHeader && !compact ? (
            <span className="hidden truncate text-xs font-medium text-ink sm:inline">
              {profile.display_name}
            </span>
          ) : null}
        </button>
        <AuthUserMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={anchorRef}
          onOpenProfile={onOpenProfile}
        />
      </div>
    );
  }

  return (
    <>
      <div className={cn('auth-button-wrap relative flex items-center gap-1.5', className)}>
        {onOpenProfile ? (
          <button
            type="button"
            title={s.stats}
            aria-label={s.stats}
            onClick={onOpenProfile}
            className="auth-button auth-button--stats grid h-9 w-9 place-items-center rounded-xl border border-edge text-ink3 transition-colors hover:bg-panel2 hover:text-ink touch-manipulation"
          >
            {profile ? (
              <Avatar seed={profile.avatar_seed} name={profile.display_name} size={24} />
            ) : (
              <Trophy className="h-4 w-4" />
            )}
          </button>
        ) : null}
        <button
          ref={signInRef}
          type="button"
          aria-expanded={authOpen}
          aria-haspopup="dialog"
          onClick={() => setAuthOpen((open) => !open)}
          className={cn(
            'auth-button auth-button--signin inline-flex items-center gap-1.5 text-white touch-manipulation bg-accent transition-all',
            isHeader
              ? 'shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 sm:gap-1.5 sm:px-3 sm:text-sm'
              : cn(
                  'min-h-9 rounded-xl px-3 text-sm font-semibold',
                  'shadow-[0_1px_2px_hsl(0_0%_0%/0.1),0_2px_8px_hsl(var(--accent-h,220)_80%_40%/0.2)]',
                  'hover:opacity-95 active:scale-[0.98]',
                  compact ? 'px-2.5' : 'px-3.5',
                ),
            authOpen &&
              !isHeader &&
              'auth-button--open ring-2 ring-accent/30 ring-offset-2 ring-offset-bg',
            authOpen && isHeader && 'auth-button--open opacity-90',
          )}
        >
          <LogIn className="h-3.5 w-3.5 shrink-0 opacity-90" />
          <span className={isHeader ? 'hidden sm:inline' : undefined}>{s.signIn}</span>
        </button>
      </div>
      <AuthPopover open={authOpen} onOpenChange={setAuthOpen} anchorRef={signInRef} />
    </>
  );
}
