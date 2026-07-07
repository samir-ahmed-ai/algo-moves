import { cn } from '@/lib/utils/cn';
import { EagleMark } from './EagleMark';

const SIZE = {
  sm: 'h-6 w-6 rounded-lg',
  md: 'h-8 w-8 rounded-xl',
} as const;

export function BrandLogo({
  size = 'md',
  className,
}: {
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <EagleMark
      className={cn(
        'brand-logo shrink-0 ring-1 ring-white/10 shadow-theme-sm',
        SIZE[size],
        className,
      )}
    />
  );
}
