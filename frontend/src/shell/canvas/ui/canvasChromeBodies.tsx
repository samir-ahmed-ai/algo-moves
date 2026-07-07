import { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { Maximize, Maximize2 } from 'lucide-react';
import {
  useWorkspace,
  tweakMeta,
  THEME_META,
  type ThemePreset,
  type CanvasHudProps,
} from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../chromeUi';
import { Toggle } from '../../ui';
import { HudBtn } from './CanvasTools';
import { PresetPopover } from './PresetPopover';
import { WorkflowPresetPopover } from './WorkflowPresetPopover';
import { Field, RADIUS_CTRL } from './nodeui';
import type { BgVariant, EdgePathType } from '../layout/layout';

const CANVAS_TWEAKS = new Set(['moveLog', 'caption', 'controls']);

function Segmented<T extends string>({
  value,
  options,
  onChange,
  cols = 2,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
  cols?: 2 | 4;
}) {
  return (
    <div
      className={cn(
        'grid gap-0.5 rounded-md bg-panel2 p-0.5',
        cols === 4 ? 'grid-cols-4' : 'grid-cols-2',
      )}
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            RADIUS_CTRL,
            chromeText.sm,
            'px-1 py-0.5 font-medium transition-colors',
            value === o.v ? 'bg-panel text-ink shadow-sm' : 'text-ink2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ThemePicker({
  value,
  onChange,
}: {
  value: ThemePreset;
  onChange: (v: ThemePreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = THEME_META.find((t) => t.id === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md border border-edge bg-panel2 px-1.5 py-1 text-left transition-colors hover:border-accent"
      >
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-edge"
          style={{ backgroundColor: current?.swatch }}
        />
        <span className={cn('min-w-0 flex-1 truncate font-medium text-ink', chromeText.sm)}>
          {current?.label ?? value}
        </span>
        <Palette className="h-3 w-3 shrink-0 text-ink3" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[280px] overflow-y-auto rounded-lg border border-edge bg-panel p-2 shadow-[var(--shadow-xl)]">
          <div className="grid grid-cols-2 gap-1.5">
            {THEME_META.map((t) => {
              const selected = t.id === value;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                  className={cn(
                    `flex items-center gap-2 border px-2 py-1.5 text-left transition-all hover:scale-[1.02] ${RADIUS_CTRL}`,
                    selected ? 'border-accent bg-accentbg' : 'border-edge hover:border-accent/50',
                  )}
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-edge"
                    style={{ backgroundColor: t.swatch }}
                  />
                  <span
                    className={cn('min-w-0 flex-1 truncate font-medium text-ink', chromeText.sm)}
                  >
                    {t.label}
                  </span>
                  {selected && <Check className="h-3 w-3 shrink-0 text-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function CanvasPropsBody({ hud, compact }: { hud: CanvasHudProps; compact?: boolean }) {
  const { edgeOpts, setEdgeOpts, bg, setBg, snap, setSnap, onPreset } = hud;
  const { tweaks, toggleTweak, themePreset, setThemePreset, dir, setDir } = useWorkspace();
  const span2 = compact ? 'col-span-2' : '';
  return (
    <div
      className={cn(
        compact
          ? 'grid grid-cols-2 gap-x-2 gap-y-1 content-start px-[var(--hpad)]'
          : 'flex flex-col gap-1.5 px-[var(--hpad)]',
      )}
    >
      <Field label="Edge type" dense className={span2}>
        <Segmented<EdgePathType>
          value={edgeOpts.pathType}
          onChange={(v) => setEdgeOpts((o) => ({ ...o, pathType: v }))}
          cols={compact ? 4 : 2}
          options={[
            { v: 'bezier', label: compact ? 'Bez' : 'Bezier' },
            { v: 'smoothstep', label: compact ? 'Smooth' : 'Smooth' },
            { v: 'step', label: 'Step' },
            { v: 'straight', label: compact ? 'Line' : 'Straight' },
          ]}
        />
      </Field>
      <Field label="Thickness" dense>
        <Segmented<string>
          value={String(edgeOpts.strokeWidth)}
          onChange={(v) => setEdgeOpts((o) => ({ ...o, strokeWidth: Number(v) }))}
          options={[
            { v: '1', label: 'Thin' },
            { v: '1.5', label: 'Med' },
            { v: '2.5', label: 'Thick' },
            { v: '4', label: 'Bold' },
          ]}
        />
      </Field>
      <div className={cn('-mx-1', span2)}>
        <Toggle
          label="Animated edges"
          dense
          checked={edgeOpts.animated}
          onChange={(v) => setEdgeOpts((o) => ({ ...o, animated: v }))}
        />
        <Toggle
          label="Arrowheads"
          dense
          checked={edgeOpts.arrow}
          onChange={(v) => setEdgeOpts((o) => ({ ...o, arrow: v }))}
        />
        <Toggle
          label="Animations"
          dense
          checked={tweaks.animate}
          onChange={() => toggleTweak('animate')}
        />
        <Toggle label="Snap to grid" dense checked={snap} onChange={setSnap} />
      </div>
      <Field label="Background" dense>
        <Segmented<BgVariant>
          value={bg}
          onChange={setBg}
          cols={compact ? 4 : 2}
          options={[
            { v: 'dots', label: 'Dots' },
            { v: 'lines', label: 'Lines' },
            { v: 'cross', label: 'Cross' },
            { v: 'none', label: 'None' },
          ]}
        />
      </Field>
      <Field label="Layout" dense>
        <Segmented<'TB' | 'LR'>
          value={dir}
          onChange={setDir}
          options={[
            { v: 'TB', label: 'Vert' },
            { v: 'LR', label: 'Horiz' },
          ]}
        />
      </Field>
      <Field label="Theme" dense className={span2}>
        <ThemePicker value={themePreset} onChange={setThemePreset} />
      </Field>
      <Field label="Preset" dense className={span2}>
        <PresetPopover onApply={onPreset} dense />
      </Field>
    </div>
  );
}

export function CanvasActionsBody() {
  const { canvasProject, focusCanvas, toggleFocusCanvas, requestFitCanvas } = useWorkspace();

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-[var(--hpad)]">
      {canvasProject && (
        <WorkflowPresetPopover
          onApply={(preset) => canvasProject.applyWorkflowPreset(preset)}
          dense
        />
      )}
      <HudBtn onClick={requestFitCanvas} title="Fit view (Z)">
        <Maximize />
      </HudBtn>
      <HudBtn onClick={toggleFocusCanvas} title="Focus canvas (C)" active={focusCanvas}>
        <Maximize2 />
      </HudBtn>
    </div>
  );
}

export function PanelsBody() {
  const { tweaks, toggleTweak } = useWorkspace();
  return (
    <div className="-mx-1 px-[var(--hpad)]">
      {tweakMeta
        .filter((t) => CANVAS_TWEAKS.has(t.key))
        .map((t) => (
          <Toggle
            key={t.key}
            dense
            label={t.label}
            hint={t.hint}
            checked={tweaks[t.key]}
            onChange={() => toggleTweak(t.key)}
          />
        ))}
    </div>
  );
}
