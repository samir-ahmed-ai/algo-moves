/**
 * shadcn/ui-style button primitive — shared variant vocabulary for canvas + shell.
 */
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { RADIUS_CTRL } from '@/design/typography';

export const buttonVariants = cva(
  'nodrag inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:opacity-90',
        good: 'bg-good text-white hover:opacity-90',
        ghost: 'bg-panel2/50 text-ink2 hover:bg-panel2 hover:text-ink',
        quiet: 'text-ink3 hover:bg-panel2 hover:text-ink',
        danger: 'text-bad hover:bg-badbg',
      },
      size: {
        xs: 'px-2 py-1 text-[0.75rem]',
        sm: 'px-2.5 py-1.5 text-[0.8125rem]',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'sm',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : props.type ?? 'button'}
        className={cn(buttonVariants({ variant, size }), RADIUS_CTRL, className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
