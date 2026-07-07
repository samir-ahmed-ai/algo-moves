import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { INTERVIEW_TOOLS, type InterviewTool } from './interviewToolkit';

type ToolAction = (id: InterviewTool['id']) => void;

function ToolTile({
  tool,
  onSelect,
  wide,
  compact,
}: {
  tool: InterviewTool;
  onSelect: ToolAction;
  wide?: boolean;
  compact?: boolean;
}) {
  const Icon = tool.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      className={cn(
        'interview-tool-tile group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-edge bg-panel/80 text-left transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-accent/40 hover:bg-panel hover:shadow-theme-sm',
        compact ? 'p-2.5' : 'gap-3 p-3',
        wide && 'col-span-2',
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full opacity-20 blur-xl transition-opacity group-hover:opacity-40"
        style={{ background: tool.c1 }}
      />
      <span
        className={cn(
          'relative grid shrink-0 place-items-center rounded-lg text-white shadow-theme-sm [&>svg]:h-4 [&>svg]:w-4',
          compact ? 'h-8 w-8' : 'h-10 w-10',
        )}
        style={{ background: `linear-gradient(135deg, ${tool.c1}, ${tool.c2})` }}
      >
        <Icon />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{tool.title}</span>
        <span className={cn('block truncate text-ink3', compact ? 'text-xs' : chromeText.sm)}>
          {tool.subtitle}
        </span>
      </span>
      <ArrowRight className="relative h-3.5 w-3.5 shrink-0 text-ink3 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
    </button>
  );
}

/** Compact interview shortcuts — signed-in users only. */
export function InterviewToolkitGrid({
  onSelect,
  compact,
  showLabel = true,
  className,
}: {
  onSelect: ToolAction;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const [canvas, plans, resumes] = INTERVIEW_TOOLS;

  return (
    <div className={cn('interview-toolkit-grid', className)}>
      {showLabel ? (
        <p className="mb-2 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-ink3">
          Interview
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {canvas ? (
          <ToolTile tool={canvas} onSelect={onSelect} {...(compact ? { compact: true } : {})} />
        ) : null}
        {plans ? (
          <ToolTile tool={plans} onSelect={onSelect} {...(compact ? { compact: true } : {})} />
        ) : null}
        {resumes ? (
          <ToolTile
            tool={resumes}
            onSelect={onSelect}
            wide
            {...(compact ? { compact: true } : {})}
          />
        ) : null}
      </div>
    </div>
  );
}
