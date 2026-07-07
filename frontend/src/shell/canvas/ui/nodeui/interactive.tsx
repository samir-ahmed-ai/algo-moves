import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { nodeText, nodeIconGlyph, RADIUS_CTRL } from '@/design/typography';
import { INPUT_CLS } from '@/components/shared/formControls';

export function SearchInput({
  value,
  onChange,
  placeholder = 'search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className={cn('pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink3', nodeIconGlyph)} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(INPUT_CLS, 'pl-7')}
      />
    </div>
  );
}

export function Option({
  children,
  onClick,
  disabled,
  state = 'idle',
  mono = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  state?: 'idle' | 'correct' | 'wrong' | 'dim';
  mono?: boolean;
}) {
  const cls = {
    idle: 'border-edge bg-panel2/60 text-ink2 hover:border-accent hover:text-ink',
    correct: 'border-good bg-goodbg text-good',
    wrong: 'border-bad bg-badbg text-bad',
    dim: 'border-edge text-ink3 opacity-60',
  }[state];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        `nodrag w-full border px-2.5 py-1.5 text-left ${nodeText.sm} transition-colors ${RADIUS_CTRL}`,
        mono && 'font-mono',
        cls,
      )}
    >
      {children}
    </button>
  );
}

export function Row({
  active = false,
  onClick,
  className,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const cls = cn(
    'flex items-center gap-[var(--node-gap,0.5rem)] border-l-2 px-[var(--node-px,0.75rem)] py-[calc(var(--node-py,0.5625rem)*0.75)] text-left transition-colors',
    nodeText.sm,
    active ? 'border-l-accent bg-accentbg/60 text-accent' : 'border-l-transparent text-ink2',
    onClick && !active && 'hover:bg-panel2 hover:text-ink',
    className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cn('nodrag w-full', cls)}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className={cn('nodrag flex cursor-pointer items-center gap-2 px-1.5 py-1 text-ink2 transition-colors hover:bg-panel2', nodeText.base, RADIUS_CTRL)}>
      <input type="checkbox" checked={checked} onChange={onChange} className="size-[var(--node-icon-glyph)] accent-[var(--accent)]" />
      <span className={cn('min-w-0 flex-1', checked && 'text-ink3 line-through')}>{children}</span>
    </label>
  );
}
