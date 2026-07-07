import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { nodeText, nodeTextWrap, nodeIconGlyph } from '@/design/typography';
import { Label } from '@/components/shared/formControls';
import type { ReactNode } from 'react';

export function Section({
  title,
  right,
  children,
  collapsible = false,
  defaultOpen = true,
  bordered = true,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  bordered?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const header = title || right;
  return (
    <section className={cn(bordered && 'border-t border-edge first:border-t-0')}>
      {header && (
        <div className="flex items-center gap-1.5 py-1.5">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="nodrag flex flex-1 items-center gap-1.5 text-left transition-colors hover:opacity-80"
            >
              <ChevronDown className={cn(nodeIconGlyph, 'text-ink3 transition-transform', !open && '-rotate-90')} />
              <Label>{title}</Label>
            </button>
          ) : (
            <div className="flex-1">
              <Label>{title}</Label>
            </div>
          )}
          {right}
        </div>
      )}
      {(!collapsible || open) && <div className={cn(header && 'pb-1.5')}>{children}</div>}
    </section>
  );
}

export function Rule({ className }: { className?: string }) {
  return <div className={cn('my-2 h-px bg-edge', className)} />;
}

export function ControlsAccordion({
  children,
  title = 'Controls',
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  right,
  accent,
  className,
  bodyClassName,
  fill,
}: {
  children: ReactNode;
  title?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  right?: ReactNode;
  accent?: string;
  className?: string;
  bodyClassName?: string;
  fill?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const toggle = () => {
    const next = !open;
    onOpenChange?.(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };
  return (
    <div className={cn('border-t border-edge/60', fill && 'flex min-h-0 flex-1 flex-col', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={cn('nodrag flex w-full items-center gap-1 py-1 font-mono text-ink3 transition-colors hover:text-ink2', nodeText.xs)}
      >
        {accent && <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />}
        <span className={cn('min-w-0 flex-1 text-left', nodeTextWrap)}>{title}</span>
        {right}
        <ChevronDown className={cn('ml-auto shrink-0 transition-transform', nodeIconGlyph, !open && '-rotate-90')} />
      </button>
      {open && (
        <div className={cn('flex flex-col gap-1 pb-1', fill && 'min-h-0 flex-1 overflow-hidden', bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}
