import { type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../chromeUi';
import { RADIUS_CTRL } from './nodeui';

/**
 * Dense inspector primitives — a compact, Figma-style property vocabulary used by
 * the right sidebar's Selection panel and the canvas property docks. Small labels,
 * tight two-column rows, icon-prefixed inputs with unit suffixes.
 */

/** A labelled group: small bold heading + tight body. */
export function InsSection({
  title,
  right,
  children,
  className,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-1', className)}>
      {title && (
        <div className="flex min-h-[16px] items-center justify-between">
          <span className={cn('font-semibold uppercase tracking-wide text-ink3', chromeText.xs)}>
            {title}
          </span>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/** Equal-width column grid for paired fields (W/H, opacity/radius…). */
export function InsGrid({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

/** Compact icon-prefixed input with a trailing unit (the core Figma-style field). */
export function InsField({
  icon,
  value,
  onChange,
  onCommit,
  unit,
  readOnly,
  title,
  type = 'text',
  min,
  max,
  step,
}: {
  icon?: ReactNode;
  value: string | number;
  onChange?: (v: string) => void;
  onCommit?: () => void;
  unit?: ReactNode;
  readOnly?: boolean;
  title?: string;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label
      title={title}
      className={cn(
        'flex h-[26px] items-center gap-1 border bg-panel2 px-1.5 transition-colors',
        RADIUS_CTRL,
        readOnly
          ? 'border-transparent opacity-70'
          : 'border-transparent hover:border-edge2 focus-within:border-accent',
      )}
    >
      {icon != null && (
        <span
          className={cn(
            'grid h-3.5 w-3.5 shrink-0 place-items-center text-ink3 [&>svg]:h-3 [&>svg]:w-3',
            chromeText.xs,
          )}
        >
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        min={min}
        max={max}
        step={step}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onCommit}
        onKeyDown={
          onCommit
            ? (e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()
            : undefined
        }
        className={cn(
          'nodrag w-full min-w-0 bg-transparent text-ink outline-none tabular-nums',
          chromeText.sm,
          readOnly && 'cursor-default',
        )}
      />
      {unit != null && (
        <span className={cn('shrink-0 select-none text-ink3', chromeText.xs)}>{unit}</span>
      )}
    </label>
  );
}

/** Compact native select styled to match InsField. */
export function InsSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex h-[26px] items-center border border-transparent bg-panel2 transition-colors',
        RADIUS_CTRL,
        !disabled && 'hover:border-edge2 focus-within:border-accent',
        disabled && 'opacity-70',
      )}
    >
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          'nodrag w-full cursor-pointer bg-transparent px-1.5 text-ink outline-none',
          chromeText.sm,
        )}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A flat label-left / control-right row. */
export function InsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn('shrink-0 text-ink3', chromeText.xs)}>{label}</span>
      <div className="flex min-w-0 items-center gap-1">{children}</div>
    </div>
  );
}
