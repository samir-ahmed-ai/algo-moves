/**
 * shadcn/ui-style button primitive — shared variant vocabulary for canvas + shell.
 */
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { RADIUS_CTRL } from '@/design/typography';

export const buttonVariants = cva(
  'ui-button nodrag inline-flex items-center justify-center gap-1.5 font-medium outline-none transition-[background-color,border-color,color,box-shadow,opacity,transform] active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
  {
    variants: {
      variant: {
        primary: 'ui-button--primary bg-accent text-white hover:opacity-90',
        good: 'ui-button--good bg-good text-white hover:opacity-90',
        ghost: 'ui-button--ghost bg-panel2/50 text-ink2 hover:bg-panel2 hover:text-ink',
        quiet: 'ui-button--quiet text-ink3 hover:bg-panel2 hover:text-ink',
        danger: 'ui-button--danger text-bad hover:bg-badbg',
      },
      size: {
        xs: 'ui-button--xs px-2 py-1 text-[0.75rem]',
        sm: 'ui-button--sm px-2.5 py-1.5 text-[0.8125rem]',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'sm',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const resolvedVariant = variant ?? 'ghost';
    const resolvedSize = size ?? 'sm';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(
          buttonVariants({ variant: resolvedVariant, size: resolvedSize }),
          RADIUS_CTRL,
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
