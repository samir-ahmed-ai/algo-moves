import type { LucideIcon } from 'lucide-react';
import {
  Keyboard,
  Map,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import { nodeText, nodeTextWrap } from '../../canvas/nodeui';
import type { VimNodeKind } from '../canvas/nodes/types';

export type OrbitAccent = 'accent' | 'good' | 'team1' | 'team2' | 'edge';

const ACCENT_RAIL: Record<OrbitAccent, string> = {
  accent: 'bg-accent',
  good: 'bg-good',
  team1: 'bg-[var(--team1-stroke)]',
  team2: 'bg-[var(--team2-stroke)]',
  edge: 'bg-edge-active',
};

const ACCENT_ICON: Record<OrbitAccent, string> = {
  accent: 'text-accent',
  good: 'text-good',
  team1: 'text-[var(--team1-stroke)]',
  team2: 'text-[var(--team2-stroke)]',
  edge: 'text-ink3',
};

export const ORBIT_PANEL_ICONS: Partial<Record<VimNodeKind, LucideIcon>> = {
  hud: Keyboard,
  maze: Map,
};

export function OrbitNodeShell({
  title,
  panelId,
  icon: IconOverride,
  accent = 'accent',
  subtitle,
  className,
  children,
  width,
}: {
  title: string;
  panelId?: VimNodeKind;
  icon?: LucideIcon;
  accent?: OrbitAccent;
  subtitle?: ReactNode;
  className?: string;
  children: ReactNode;
  width?: number;
}) {
  const Icon = IconOverride ?? (panelId ? ORBIT_PANEL_ICONS[panelId] : undefined);

  return (
    <div
      className={cn(
        'vim-orbit-node flex overflow-hidden rounded-[var(--radius)] border border-edge/80 bg-panel/90 backdrop-blur-md',
        className,
      )}
      style={width ? { width } : undefined}
    >
      <div className={cn('w-[3px] shrink-0', ACCENT_RAIL[accent])} aria-hidden />
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-2 border-b border-edge/40 px-3 py-2">
          {Icon ? (
            <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel2/80', ACCENT_ICON[accent])}>
              <Icon className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <span className={cn('block font-semibold text-ink', nodeTextWrap, nodeText.title)}>{title}</span>
            {subtitle ? <span className={cn('block text-ink3', nodeTextWrap, nodeText.xs)}>{subtitle}</span> : null}
          </div>
        </header>
        <div className={cn('px-3 py-2.5', nodeText.sm)}>{children}</div>
      </div>
    </div>
  );
}
