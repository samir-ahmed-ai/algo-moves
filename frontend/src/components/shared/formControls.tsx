/**
 * Shared, presentational form primitives (labels, buttons, inputs) used across
 * canvas nodes, effect controls, and plugin panels. Depends only on design
 * tokens + cn, so it sits in the shared components leaf instead of shell/canvas.
 * `nodeui` re-exports these for its existing consumers.
 */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils/cn';
import { Button, buttonVariants } from '@/components/ui/button';
import { nodeText, RADIUS_CTRL } from '@/design/typography';

/** Uppercase field/section label. */
export function Label({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): ReactNode {
  return (
    <span className={cn(nodeText.label, 'shared-label text-ink3', className)}>{children}</span>
  );
}

/** Muted one-line helper copy. */
export function Hint({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): ReactNode {
  return (
    <p className={cn(nodeText.sm, 'shared-hint leading-snug text-ink3', className)}>{children}</p>
  );
}

type BtnVariant = 'primary' | 'good' | 'ghost' | 'quiet' | 'danger';
type BtnSize = 'xs' | 'sm';

const BTN_VARIANT: Readonly<
  Record<BtnVariant, NonNullable<Parameters<typeof buttonVariants>[0]>['variant']>
> = {
  primary: 'primary',
  good: 'good',
  ghost: 'ghost',
  quiet: 'quiet',
  danger: 'danger',
};

const BTN_SIZE: Readonly<
  Record<BtnSize, NonNullable<Parameters<typeof buttonVariants>[0]>['size']>
> = {
  xs: 'xs',
  sm: 'sm',
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
  readonly variant?: BtnVariant;
  readonly size?: BtnSize;
  readonly icon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>): ReactNode {
  return (
    <Button
      {...rest}
      type={rest.type ?? 'button'}
      variant={BTN_VARIANT[variant]}
      size={BTN_SIZE[size]}
      className={cn('shared-btn', `shared-btn--${variant}`, `shared-btn--${size}`, className)}
    >
      {icon && <span className="shared-btn__icon">{icon}</span>}
      {children}
    </Button>
  );
}

export function Field({
  label,
  hint,
  children,
  dense,
  className,
}: {
  readonly label?: string;
  readonly hint?: string;
  readonly children: ReactNode;
  readonly dense?: boolean;
  readonly className?: string;
}): ReactNode {
  return (
    <label
      className={cn(
        'shared-field flex flex-col',
        dense ? 'shared-field--dense gap-0.5' : 'gap-1',
        className,
      )}
    >
      {label && (
        <Label
          className={cn('shared-field__label', dense && '!text-[length:var(--node-fs-xs,12px)]')}
        >
          {label}
        </Label>
      )}
      {children}
      {hint && <Hint className="shared-field__hint">{hint}</Hint>}
    </label>
  );
}

/** Shared input class (used by TextInput/TextArea and canvas SearchInput). */
export const INPUT_CLS = `shared-input nodrag w-full border border-edge bg-panel2 px-2 py-1.5 ${nodeText.sm} text-ink outline-none transition-colors placeholder:text-ink3 focus:border-accent ${RADIUS_CTRL}`;

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return (
    <input
      {...props}
      data-invalid={props['aria-invalid'] ? 'true' : undefined}
      className={cn(INPUT_CLS, 'shared-text-input', props.className)}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactNode {
  return (
    <textarea
      {...props}
      data-invalid={props['aria-invalid'] ? 'true' : undefined}
      className={cn(
        INPUT_CLS,
        'shared-text-area min-h-[4.5rem] resize-none leading-relaxed',
        props.className,
      )}
    />
  );
}
