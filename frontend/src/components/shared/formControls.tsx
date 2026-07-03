/**
 * Shared, presentational form primitives (labels, buttons, inputs) used across
 * canvas nodes, effect controls, and plugin panels. Depends only on design
 * tokens + cn, so it sits in the shared components leaf instead of shell/canvas.
 * `nodeui` re-exports these for its existing consumers.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { nodeText, RADIUS_CTRL } from '@/design/typography';

/** Uppercase field/section label. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(nodeText.label, 'text-ink3', className)}>{children}</span>;
}

/** Muted one-line helper copy. */
export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn(nodeText.sm, 'leading-snug text-ink3', className)}>{children}</p>;
}

type BtnVariant = 'primary' | 'good' | 'ghost' | 'quiet' | 'danger';
type BtnSize = 'xs' | 'sm';

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  good: 'bg-good text-white hover:opacity-90',
  ghost: 'bg-panel2/50 text-ink2 hover:bg-panel2 hover:text-ink',
  quiet: 'text-ink3 hover:bg-panel2 hover:text-ink',
  danger: 'text-bad hover:bg-badbg',
};

const BTN_SIZE: Record<BtnSize, string> = {
  xs: cn('px-2 py-1', nodeText.xs),
  sm: cn('px-2.5 py-1.5', nodeText.sm),
};

/** The single button vocabulary — every node button is one of these. */
export function Btn({
  variant = 'ghost',
  size = 'sm',
  icon,
  children,
  className,
  ...rest
}: {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'nodrag inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        RADIUS_CTRL,
        BTN_VARIANT[variant],
        BTN_SIZE[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  dense,
  className,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  dense?: boolean;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col', dense ? 'gap-0.5' : 'gap-1', className)}>
      {label && <Label className={dense ? '!text-[length:var(--node-fs-xs,12px)]' : undefined}>{label}</Label>}
      {children}
      {hint && <Hint>{hint}</Hint>}
    </label>
  );
}

/** Shared input class (used by TextInput/TextArea and canvas SearchInput). */
export const INPUT_CLS =
  `nodrag w-full border border-edge bg-panel2 px-2 py-1.5 ${nodeText.sm} text-ink outline-none transition-colors placeholder:text-ink3 focus:border-accent ${RADIUS_CTRL}`;

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(INPUT_CLS, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(INPUT_CLS, 'min-h-[4.5rem] resize-none leading-relaxed', props.className)}
    />
  );
}
