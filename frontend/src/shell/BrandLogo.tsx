import { cn } from '@/lib/utils/cn';
import { EagleMark } from './EagleMark';

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
  return <EagleMark className={cn('shrink-0 rounded-[22%] shadow-sm', SIZE[size], className)} />;
}
