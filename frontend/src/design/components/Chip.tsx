import type { ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Sparkles,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { nodeText } from '@/design/typography';
import { normalizeUiTone, TONE_CHIP, type UiTone } from '@/design/tone';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** Semantic leading icon per tone — colored via the chip's tone `currentColor`. */
const TONE_ICON: Readonly<Record<UiTone, LucideIcon>> = {
  default: Tag,
  accent: Sparkles,
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: AlertCircle,
  muted: Circle,
};

export function Chip({
  children,
  tone = 'default',
  mono = false,
  icon,
  className,
}: {
  readonly children: ReactNode;
  readonly tone?: UiTone;
  readonly mono?: boolean;
  /** Override the leading icon. Pass `null` to hide it entirely. */
  readonly icon?: ReactNode | null;
  readonly className?: string;
}) {
  const safeTone = normalizeUiTone(tone);
  const ToneIcon = TONE_ICON[safeTone];
  // Default: show the tone icon for label chips; skip for numeric/mono chips.
  const node = icon === undefined ? !mono && <ToneIcon className="design-chip__glyph" /> : icon;

  return (
    <span
      className={cx(
        'design-chip inline-flex items-center gap-1 rounded-full px-[calc(var(--node-px,0.75rem)*0.5)] py-[calc(var(--node-py,0.5625rem)*0.35)] font-medium leading-none',
        nodeText.xs,
        `design-chip--${safeTone}`,
        mono && 'design-chip--mono font-mono tabular-nums',
        TONE_CHIP[safeTone],
        className,
      )}
    >
      {node && (
        <span className="design-chip__icon inline-flex shrink-0 items-center" aria-hidden>
          {node}
        </span>
      )}
      {children}
    </span>
  );
}
