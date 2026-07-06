import { useRef, useState } from 'react';
import { Loader2, LogIn, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from './AuthProvider';
import { Avatar } from '@/shell/games/ui/Avatar';
import { authStrings as s } from './strings';
import { AuthPopover, AuthUserMenu } from './AuthPopover';

export function AuthButton({
  onOpenProfile,
  compact,
  className,
}: {
  /** Games arcade: open the progress overlay from the user menu. */
  onOpenProfile?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const { configured, loading, profile, isAnonymous } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const signInRef = useRef<HTMLButtonElement>(null);

  if (!configured) return null;
  if (loading) {
    return (
      <span className={cn('inline-grid h-9 w-9 place-items-center text-ink3', className)} aria-hidden>
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  const signedIn = profile && !isAnonymous;

  if (signedIn) {
    return (
      <div className={cn('relative', className)}>
        <button
          ref={anchorRef}
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            'inline-flex min-h-9 items-center gap-2 rounded-xl border border-edge bg-panel2 px-2 text-ink3 transition-all hover:bg-panel hover:text-ink touch-manipulation',
            menuOpen && 'border-accent/40 ring-2 ring-accent/15',
            compact ? 'max-w-[8rem]' : 'max-w-[10rem]',
          )}
          title={profile.display_name}
        >
          <Avatar seed={profile.avatar_seed} name={profile.display_name} size={24} />
          {!compact ? (
            <span className="truncate text-sm font-semibold text-ink">{profile.display_name}</span>
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
      <div className={cn('relative flex items-center gap-1.5', className)}>
        {onOpenProfile ? (
          <button
            type="button"
            title={s.stats}
            aria-label={s.stats}
            onClick={onOpenProfile}
            className="grid h-9 w-9 place-items-center rounded-xl border border-edge text-ink3 transition-colors hover:bg-panel2 hover:text-ink touch-manipulation"
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
            'inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white touch-manipulation',
            'bg-accent shadow-[0_1px_2px_hsl(0_0%_0%/0.1),0_2px_8px_hsl(var(--accent-h,220)_80%_40%/0.2)]',
            'transition-all hover:opacity-95 active:scale-[0.98]',
            authOpen && 'ring-2 ring-accent/30 ring-offset-2 ring-offset-bg',
            compact ? 'px-2.5' : 'px-3.5',
          )}
        >
          <LogIn className="h-3.5 w-3.5 shrink-0 opacity-90" />
          {s.signIn}
        </button>
      </div>
      <AuthPopover open={authOpen} onOpenChange={setAuthOpen} anchorRef={signInRef} />
    </>
  );
}
