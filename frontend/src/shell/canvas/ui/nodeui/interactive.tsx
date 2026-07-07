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
    <div className="node-search-input relative">
      <Search
        className={cn(
          'node-search-input__icon pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink3',
          nodeIconGlyph,
        )}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className={cn(INPUT_CLS, 'node-search-input__field pl-7')}
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
      data-state={state}
      onClick={onClick}
      className={cn(
        `node-option nodrag w-full border px-2.5 py-1.5 text-left ${nodeText.sm} transition-colors ${RADIUS_CTRL}`,
        mono && 'font-mono',
        `node-option--${state}`,
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
    'node-row flex items-center gap-[var(--node-gap,0.5rem)] border-l-2 px-[var(--node-px,0.75rem)] py-[calc(var(--node-py,0.5625rem)*0.75)] text-left transition-colors',
    nodeText.sm,
    active
      ? 'node-row--active border-l-accent bg-accentbg/60 text-accent'
      : 'border-l-transparent text-ink2',
    onClick && !active && 'hover:bg-panel2 hover:text-ink',
    className,
  );
  return onClick ? (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('nodrag w-full', cls)}
    >
      {children}
    </button>
  ) : (
    <div data-active={active ? 'true' : undefined} className={cls}>
      {children}
    </div>
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
    <label
      data-checked={checked ? 'true' : 'false'}
      className={cn(
        'node-check-row nodrag flex cursor-pointer items-center gap-2 px-1.5 py-1 text-ink2 transition-colors hover:bg-panel2',
        nodeText.base,
        RADIUS_CTRL,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="node-check-row__input size-[var(--node-icon-glyph)] accent-[var(--accent)]"
      />
      <span
        className={cn('node-check-row__label min-w-0 flex-1', checked && 'text-ink3 line-through')}
      >
        {children}
      </span>
    </label>
  );
}
