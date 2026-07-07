import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../chromeUi';
import { SidebarSection } from '../../SidebarShell';
import type { CanvasWidget } from './types';

/** The monospace pill used for section badges (peer count, step index, …). */
export function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full bg-panel2 px-1 py-px font-mono tabular-nums text-ink3',
        chromeText.xs,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Renders one registered widget as a collapsible sidebar section. Owns its own
 * open state and honors the widget's visibility gate, so the sidebar itself
 * carries no per-section bookkeeping — it just maps over the registered set.
 */
export function WidgetSection({ widget }: { widget: CanvasWidget }) {
  const visible = widget.useVisible ? widget.useVisible() : true;
  const [open, setOpen] = useState(widget.defaultOpen ?? false);
  if (!visible) return null;
  const { Body, Badge } = widget;
  return (
    <SidebarSection
      icon={widget.icon}
      title={widget.title}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      maxHeightClass={widget.maxHeightClass}
      badge={Badge ? <Badge /> : undefined}
    >
      <Body />
    </SidebarSection>
  );
}
