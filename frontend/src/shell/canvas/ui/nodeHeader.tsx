import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { GripVertical, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { nodeText, nodeTextWrap, nodeIconGlyph } from '@/design/typography';
import {
  BODY_PAD,
  BODY_PAD_NARROW,
  HEADER_ICON,
  HEADER_PAD,
  HEADER_TITLE,
  type HeaderDensity,
} from './panelHeaderTokens';

export type { HeaderDensity };

export function PanelHeader({
  children,
  collapsed,
  locked,
  density = 'compact',
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  collapsed?: boolean;
  locked?: boolean;
  density?: HeaderDensity;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex shrink-0 select-none items-center justify-between gap-2',
        HEADER_PAD[density],
        collapsed && 'py-0.5',
        locked && 'opacity-90',
        className,
      )}
    >
      {children}
    </header>
  );
}

export function PanelHeaderGrip({ density = 'compact' }: { density?: HeaderDensity }) {
  return (
    <span
      className={cn(
        'grid shrink-0 cursor-grab place-items-center text-ink3 active:cursor-grabbing',
        density === 'spacious'
          ? 'h-[calc(var(--node-icon,1.125rem)*1.1)] w-[calc(var(--node-icon,1.125rem)*0.65)]'
          : 'h-[var(--node-icon,1.125rem)] w-[calc(var(--node-icon,1.125rem)*0.65)]',
      )}
      aria-hidden
    >
      <GripVertical
        className={cn(
          density === 'spacious'
            ? 'h-[calc(var(--node-icon,1.125rem)*1.1)] w-[calc(var(--node-icon,1.125rem)*1.1)]'
            : 'h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)]',
        )}
      />
    </span>
  );
}

export function PanelHeaderIcon({
  color,
  density = 'compact',
  children,
}: {
  color?: string;
  density?: HeaderDensity;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(HEADER_ICON[density], color ? undefined : 'text-ink2')}
      style={color ? { color } : undefined}
    >
      {children}
    </span>
  );
}

export function PanelHeaderTitle({
  children,
  density = 'compact',
  className,
}: {
  children: ReactNode;
  density?: HeaderDensity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'min-w-0 flex-1 cursor-grab font-semibold text-ink active:cursor-grabbing',
        nodeTextWrap,
        HEADER_TITLE[density],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PanelHeaderMeta({
  children,
  density = 'compact',
  className,
}: {
  children: ReactNode;
  density?: HeaderDensity;
  className?: string;
}) {
  const metaSize =
    density === 'ultra' ? nodeText.xs : density === 'spacious' ? nodeText.sm : nodeText.sm;
  return (
    <span className={cn('shrink-0 font-mono tabular-nums text-ink3', metaSize, className)}>{children}</span>
  );
}

export function PanelHeaderSub({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1 font-mono text-ink3', nodeText.sm, className)}>{children}</div>
  );
}

export function PanelHeaderActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('nodrag ml-auto flex shrink-0 cursor-default items-center gap-1', className)}>{children}</div>
  );
}

export function PanelBody({
  children,
  density = 'compact',
  fill,
  flush,
  narrow,
  className,
  style,
}: {
  children: ReactNode;
  density?: HeaderDensity;
  fill?: boolean;
  flush?: boolean;
  narrow?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const pad = flush ? '' : narrow ? BODY_PAD_NARROW[density] : BODY_PAD[density];
  return (
    <div
      className={cn(
        'panel-node-body nowheel flex flex-col text-ink',
        flush ? 'gap-0 rounded-none bg-transparent p-0' : cn('gap-[var(--node-gap,0.5rem)] rounded-[calc(var(--radius)-2px)] bg-panel'),
        fill ? 'min-h-0 flex-1 overflow-hidden' : 'shrink-0 overflow-x-auto',
        pad,
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
