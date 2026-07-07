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
        'grid-toggle-button h-5 w-5 rounded-sm border',
        active
          ? 'grid-toggle-button--active border-accent bg-accent/30'
          : 'grid-toggle-button--idle border-edge bg-panel2',
        className,
      )}
      aria-pressed={active}
    />
  );
}
