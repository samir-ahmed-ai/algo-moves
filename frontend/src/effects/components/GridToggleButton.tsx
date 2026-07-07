import { cn } from '@/lib/utils/cn';

/** Shared step-cell toggle used by beat/polyrhythm input builders. */
export function GridToggleButton({
  active,
  onClick,
  className,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-5 w-5 rounded-sm border',
        active ? 'border-accent bg-accent/30' : 'border-edge bg-panel2',
        className,
      )}
    />
  );
}
