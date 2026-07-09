import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { SearchTrigger, openGlobalSearch } from '@/shell/search';

export interface PageHeaderProps {
  /** Leading back/home action. Omitted → no leading button. */
  onBack?: () => void;
  backLabel?: string;
  /** Identity icon (lucide element) shown in the accent tile. */
  icon: ReactNode;
  /** Optional gradient for the icon tile; defaults to the accent fill. */
  iconGradient?: { c1: string; c2: string } | undefined;
  /** Uppercase mini-line under the title. */
  eyebrow: string;
  /** Bold primary line. */
  title: string;
  /** Right-aligned, page-specific controls. */
  actions?: ReactNode;
  className?: string;
  /** Show the global search trigger (default true). */
  showSearch?: boolean;
}

/**
 * Canonical top bar for full-page product surfaces (Profile, Plans, Resumes, Dojo hub…).
 * A slim sticky glass bar: leading action · accent icon tile · title / eyebrow · actions.
 */
export function PageHeader({
  onBack,
  backLabel = 'Back',
  icon,
  iconGradient,
  eyebrow,
  title,
  actions,
  className,
  showSearch = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-[var(--surface-glass)] px-4 shadow-[0_1px_0_color-mix(in_srgb,var(--border)_55%,transparent)] backdrop-blur-xl',
        className,
      )}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          title={backLabel}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-edge text-ink3 transition hover:bg-panel2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : null}

      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-[var(--accent-contrast)] shadow-theme-sm [&>svg]:h-4 [&>svg]:w-4"
          style={
            iconGradient
              ? { background: `linear-gradient(135deg, ${iconGradient.c1}, ${iconGradient.c2})` }
              : { background: 'var(--accent)' }
          }
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold leading-tight text-ink">{title}</span>
          <span className="block truncate text-[length:var(--fs-2xs)] font-medium uppercase tracking-[0.14em] text-ink3">
            {eyebrow}
          </span>
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {showSearch ? <SearchTrigger onOpen={openGlobalSearch} /> : null}
        {actions}
      </div>
    </header>
  );
}
