import type { ReactNode } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import * as Switch from '@radix-ui/react-switch';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';
import { getTag, type TagKind } from '../content';
import { chromeText, ChromeHint, ChromeLabel } from './chromeUi';

const tagKindColor: Record<TagKind, string> = {
  pattern: 'var(--accent)',
  structure: 'var(--good)',
  skill: 'var(--team2-stroke)',
  meta: 'var(--text-3)',
};

export function TagChip({ id }: { id: string }) {
  const t = getTag(id);
  return (
    <span className={cn('inline-flex items-center gap-1 rounded bg-panel2 px-1.5 py-0.5 text-ink2', chromeText.sm)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tagKindColor[t.kind] }} />
      {t.label}
    </span>
  );
}

export function Section({
  value,
  title,
  icon,
  badge,
  children,
}: {
  value: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Accordion.Item value={value} className="border-b border-edge last:border-0">
      <Accordion.Header className="flex">
        <Accordion.Trigger className={cn('group flex min-h-[var(--row)] w-full items-center gap-1.5 px-[var(--hpad)] py-0.5 text-ink3 outline-none transition-colors hover:text-ink2')}>
          <ChevronRight className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
          {icon}
          <ChromeLabel className="min-w-0 flex-1 truncate normal-case">{title}</ChromeLabel>
          {badge}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="pb-1">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  dense,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  dense?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-2 px-[var(--hpad)] hover:bg-panel2',
        dense ? 'py-0.5' : 'py-1.5',
      )}
    >
      <span className="min-w-0">
        <span className={cn('block text-ink', dense ? chromeText.sm : chromeText.base)}>{label}</span>
        {hint && <ChromeHint className="block truncate">{hint}</ChromeHint>}
      </span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        className={cn(
          'relative shrink-0 rounded-full bg-edge2 outline-none transition-colors data-[state=checked]:bg-accent',
          dense ? 'h-4 w-7' : 'h-[18px] w-8',
        )}
      >
        <Switch.Thumb
          className={cn(
            'block rounded-full bg-white shadow-sm transition-transform duration-200 will-change-transform',
            dense
              ? 'h-3 w-3 translate-x-[2px] data-[state=checked]:translate-x-3.5'
              : 'h-3.5 w-3.5 translate-x-[2px] data-[state=checked]:translate-x-4',
          )}
        />
      </Switch.Root>
    </label>
  );
}

export function Rail({ items, onExpand }: { items: { icon: ReactNode; label: string }[]; onExpand: () => void }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1.5">
      {items.map((it, i) => (
        <button
          key={i}
          onClick={onExpand}
          title={it.label}
          aria-label={it.label}
          className="grid h-5 w-5 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
        >
          {it.icon}
        </button>
      ))}
    </div>
  );
}
