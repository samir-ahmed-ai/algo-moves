import { cn } from '@/lib/utils/cn';

const LOGO_SRC = '/assets/logo.png';

const SIZE = {
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
} as const;

export function BrandLogo({
  size = 'md',
  className,
}: {
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <img
      src={LOGO_SRC}
      alt="Algo Moves"
      className={cn('shrink-0 rounded-full object-cover', SIZE[size], className)}
    />
  );
}
