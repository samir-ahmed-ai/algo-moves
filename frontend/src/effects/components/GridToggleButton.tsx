import { cn } from '@/lib/utils/cn';

interface GridToggleButtonProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly className?: string;
  readonly label?: string;
}

/** Shared step-cell toggle used by beat/polyrhythm input builders. */
export function GridToggleButton({
  active,
  onClick,
  className,
  label = active ? 'Disable step' : 'Enable step',
}: GridToggleButtonProps): React.ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'grid-toggle-button h-5 w-5 rounded-sm border',
        active
          ? 'grid-toggle-button--active border-accent bg-accent/30'
          : 'grid-toggle-button--idle border-edge bg-panel2',
        className,
      )}
    />
  );
}
