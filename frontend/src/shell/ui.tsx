import * as Switch from '@radix-ui/react-switch';
import { cn } from '@/lib/utils/cn';
import { getTag } from '../content';
import { TAG_KIND_COLOR } from '../content/tagColors';
import { chromeText, ChromeHint } from './chromeUi';

export function TagChip({ id }: { id: string }) {
  const t = getTag(id);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded bg-panel2 px-1.5 py-0.5 text-ink2',
        chromeText.sm,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: TAG_KIND_COLOR[t.kind] }} />
      {t.label}
    </span>
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
        <span className={cn('block text-ink', dense ? chromeText.sm : chromeText.base)}>
          {label}
        </span>
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
