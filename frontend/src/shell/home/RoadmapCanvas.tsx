import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Code2, Gamepad2, GraduationCap, Keyboard, Megaphone, Target, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { EagleMark } from '@/shell/EagleMark';

/* --------------------------------------------------------------- artwork */

type ArtKind = 'interview' | 'problems' | 'tracks' | 'learn' | 'vim' | 'games';

function StopArt({ kind, c1, c2 }: { kind: ArtKind; c1: string; c2: string }) {
  const raw = useId().replace(/:/g, '');
  const g = `sa-${raw}`;
  const soft = `sas-${raw}`;
  const glow = `sag-${raw}`;

  return (
    <svg viewBox="0 0 128 96" fill="none" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="128" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <linearGradient id={soft} x1="0" y1="0" x2="0" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={c1} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor={c1} stopOpacity="0.55" />
          <stop offset="100%" stopColor={c1} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="128" height="96" rx="16" fill={`url(#${soft})`} />
      <circle cx="40" cy="34" r="46" fill={`url(#${glow})`} />

      {kind === 'interview' && (
        <g>
          <circle cx="52" cy="48" r="30" stroke={`url(#${g})`} strokeWidth="4" opacity="0.55" />
          <circle cx="52" cy="48" r="20" stroke={`url(#${g})`} strokeWidth="4" opacity="0.8" />
          <circle cx="52" cy="48" r="8" fill={`url(#${g})`} />
          <path d="M78 20 L104 24 L98 40 L84 34 Z" fill={`url(#${g})`} />
          <path d="M84 34 L52 48" stroke={c2} strokeWidth="4" strokeLinecap="round" />
        </g>
      )}

      {kind === 'problems' && (
        <g>
          <rect
            x="18"
            y="22"
            width="92"
            height="56"
            rx="10"
            fill={`url(#${soft})`}
            stroke={`url(#${g})`}
            strokeWidth="3"
          />
          <path
            d="M40 46 L30 56 L40 66"
            stroke={`url(#${g})`}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M88 46 L98 56 L88 66"
            stroke={`url(#${g})`}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      )}

      {kind === 'tracks' && (
        <g>
          <path
            d="M64 82 C64 62 34 58 34 34"
            stroke={`url(#${g})`}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M64 82 C64 62 96 58 96 34"
            stroke={c2}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />
          <circle cx="64" cy="82" r="6" fill={`url(#${g})`} />
        </g>
      )}

      {kind === 'learn' && (
        <g>
          <circle cx="40" cy="30" r="7" fill={`url(#${g})`} />
          <circle cx="84" cy="24" r="9" fill={`url(#${g})`} />
          <circle cx="58" cy="62" r="7" fill={c2} />
          <circle cx="100" cy="54" r="6" fill={c1} />
        </g>
      )}

      {kind === 'vim' && (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={`t${i}`}
              x={26 + i * 20}
              y="30"
              width="16"
              height="16"
              rx="4"
              fill={`url(#${soft})`}
              stroke={`url(#${g})`}
              strokeWidth="2.5"
            />
          ))}
        </g>
      )}

      {kind === 'games' && (
        <g>
          <rect
            x="24"
            y="38"
            width="80"
            height="34"
            rx="17"
            fill={`url(#${soft})`}
            stroke={`url(#${g})`}
            strokeWidth="3"
          />
          <path
            d="M42 49 v10 M37 54 h10"
            stroke={`url(#${g})`}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}

/* ----------------------------------------------------------------- stops */

interface StopAction {
  label: string;
  onClick: () => void;
}

interface RoadStop {
  key: string;
  kind: ArtKind;
  c1: string;
  c2: string;
  icon: ReactNode;
  title: string;
  actions: [StopAction, ...StopAction[]];
}

export interface RoadmapCanvasProps {
  prepProblemCount: number;
  problemsCount: number;
  goConceptCount: number;
  openrtbConceptCount: number;
  onInterviewPrep: () => void;
  onProblems: () => void;
  onGo: () => void;
  onOpenrtb: () => void;
  onLearn: () => void;
  onVisualize: () => void;
  onVim: () => void;
  onGames: () => void;
}

function buildStops(p: RoadmapCanvasProps): RoadStop[] {
  return [
    {
      key: 'interview',
      kind: 'interview',
      c1: '#7c5cff',
      c2: '#b06bff',
      icon: <Target />,
      title: 'Interview Prep',
      actions: [{ label: 'Browse prep', onClick: p.onInterviewPrep }],
    },
    {
      key: 'problems',
      kind: 'problems',
      c1: '#21a7ff',
      c2: '#2f6bff',
      icon: <Code2 />,
      title: 'Problems',
      actions: [{ label: 'Play a problem', onClick: p.onProblems }],
    },
    {
      key: 'tracks',
      kind: 'tracks',
      c1: '#16c79a',
      c2: '#0e9aa5',
      icon: <Megaphone />,
      title: 'Specialized Tracks',
      actions: [{ label: 'Go track', onClick: p.onGo }],
    },
    {
      key: 'learn',
      kind: 'learn',
      c1: '#ffb020',
      c2: '#ff7a1a',
      icon: <GraduationCap />,
      title: 'Learn & Visualize',
      actions: [{ label: 'Open studio', onClick: p.onLearn }],
    },
    {
      key: 'vim',
      kind: 'vim',
      c1: '#ff4d94',
      c2: '#7c3aed',
      icon: <Keyboard />,
      title: 'Vim Dojo',
      actions: [{ label: 'Enter the Dojo', onClick: p.onVim }],
    },
    {
      key: 'games',
      kind: 'games',
      c1: '#ff6b4a',
      c2: '#ff2d55',
      icon: <Gamepad2 />,
      title: 'Games',
      actions: [{ label: 'Start a room', onClick: p.onGames }],
    },
  ];
}

/* ------------------------------------------------------------ layout math */

interface Connector {
  d: string;
  c1: string;
}

interface LayoutState {
  w: number;
  h: number;
  cx: number;
  spinePath: string;
  connectors: Connector[];
}

function centerY(el: HTMLElement, cr: DOMRect) {
  const r = el.getBoundingClientRect();
  return r.top - cr.top + r.height / 2;
}

function centerX(el: HTMLElement, cr: DOMRect) {
  const r = el.getBoundingClientRect();
  return r.left - cr.left + r.width / 2;
}

/** Horizontal connector from card edge to spine dot. */
function connectorPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${midX.toFixed(1)} ${y1.toFixed(1)}, ${midX.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

const StopCard = forwardRef<
  HTMLButtonElement,
  { stop: RoadStop; index: number; side: 'left' | 'right' }
>(function StopCard({ stop, index, side }, ref) {
  const [primary] = stop.actions;

  return (
    <button
      ref={ref}
      type="button"
      onClick={primary.onClick}
      aria-label={primary.label}
      className={cn(
        'roadmap-stop group relative w-full max-w-[136px] overflow-hidden rounded-xl border border-edge bg-panel/70 p-1.5 text-left shadow-[var(--shadow-sm)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] sm:max-w-[152px]',
        side === 'left' ? 'ml-auto' : 'mr-auto',
      )}
      style={
        {
          '--stop-c1': stop.c1,
          '--stop-c2': stop.c2,
          animationDelay: `${index * 90}ms`,
        } as CSSProperties
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-55"
        style={{ background: stop.c1 }}
      />

      <div className="relative mb-1 h-12 w-full overflow-hidden rounded-lg border border-edge/70 sm:h-14">
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.05]">
          <StopArt kind={stop.kind} c1={stop.c1} c2={stop.c2} />
        </div>
        <span
          className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-md text-white shadow-[var(--shadow-sm)] [&>svg]:h-3.5 [&>svg]:w-3.5"
          style={{ background: `linear-gradient(135deg, ${stop.c1}, ${stop.c2})` }}
        >
          {stop.icon}
        </span>
      </div>

      <h3 className="truncate text-center text-[length:var(--fs-tight)] font-semibold tracking-tight text-ink sm:text-xs">
        {stop.title}
      </h3>
    </button>
  );
});

function StopRow({
  stop,
  index,
  cardRef,
  dotRef,
}: {
  stop: RoadStop;
  index: number;
  cardRef: (el: HTMLButtonElement | null) => void;
  dotRef: (el: HTMLSpanElement | null) => void;
}) {
  const side = index % 2 === 0 ? 'left' : 'right';

  return (
    <div className="roadmap-row grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-x-1 py-0.5 sm:grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] sm:gap-x-1 sm:py-1">
      <div className="min-w-0">
        {side === 'left' ? <StopCard ref={cardRef} stop={stop} index={index} side="left" /> : null}
      </div>

      <div className="relative z-10 flex justify-center">
        <span
          ref={dotRef}
          className="roadmap-dot relative grid h-7 w-7 place-items-center rounded-full border-2 border-bg font-mono text-[length:var(--fs-2xs)] font-semibold text-white shadow-[var(--shadow-sm)] sm:h-8 sm:w-8 sm:text-[length:var(--fs-tight)]"
          style={
            {
              background: `linear-gradient(135deg, ${stop.c1}, ${stop.c2})`,
              '--stop-c1': stop.c1,
            } as CSSProperties
          }
        >
          {index + 1}
        </span>
      </div>

      <div className="min-w-0">
        {side === 'right' ? (
          <StopCard ref={cardRef} stop={stop} index={index} side="right" />
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- component */

export function RoadmapCanvas(props: RoadmapCanvasProps) {
  const stops = buildStops(props);
  const gradId = useId().replace(/:/g, '');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<HTMLDivElement | null>(null);
  const finishRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dotRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  const [layout, setLayout] = useState<LayoutState>({
    w: 0,
    h: 0,
    cx: 0,
    spinePath: '',
    connectors: [],
  });

  const measure = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;

    const cr = c.getBoundingClientRect();
    const w = cr.width;
    const h = cr.height;
    const cx = w / 2;

    const spineNodes = [startRef.current, ...dotRefs.current, finishRef.current].filter(
      Boolean,
    ) as HTMLElement[];
    const spineYs = spineNodes.map((el) => centerY(el, cr));

    const spinePath =
      spineYs.length >= 2
        ? `M ${cx.toFixed(1)} ${spineYs[0].toFixed(1)} L ${cx.toFixed(1)} ${spineYs[spineYs.length - 1].toFixed(1)}`
        : '';

    const connectors: Connector[] = [];

    stopsRef.current.forEach((stop, i) => {
      const card = cardRefs.current[i];
      const dot = dotRefs.current[i];
      if (!card || !dot) return;

      const cardR = card.getBoundingClientRect();
      const dotX = centerX(dot, cr);
      const dotY = centerY(dot, cr);
      const cardCY = cardR.top - cr.top + cardR.height / 2;
      const side = i % 2 === 0 ? 'left' : 'right';
      const edgeX = side === 'left' ? cardR.right - cr.left : cardR.left - cr.left;

      connectors.push({
        d: connectorPath(edgeX, cardCY, dotX, dotY),
        c1: stop.c1,
      });
    });

    const next = { w, h, cx, spinePath, connectors };
    setLayout((prev) => {
      const sameConnectors =
        prev.connectors.length === next.connectors.length &&
        prev.connectors.every(
          (c, i) => c.d === next.connectors[i].d && c.c1 === next.connectors[i].c1,
        );
      if (
        prev.w === next.w &&
        prev.h === next.h &&
        prev.cx === next.cx &&
        prev.spinePath === next.spinePath &&
        sameConnectors
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const c = containerRef.current;
    if (!c) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(c);
    window.addEventListener('resize', measure);
    const raf = requestAnimationFrame(measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(raf);
    };
  }, [measure]);

  const setCardRef = (idx: number) => (el: HTMLButtonElement | null) => {
    cardRefs.current[idx] = el;
  };

  const setDotRef = (idx: number) => (el: HTMLSpanElement | null) => {
    dotRefs.current[idx] = el;
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full px-2 pb-8 pt-2 sm:px-3 sm:pb-10 sm:pt-3"
    >
      {layout.w > 0 && layout.spinePath ? (
        <svg
          className="pointer-events-none absolute inset-0"
          width={layout.w}
          height={layout.h}
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          fill="none"
          aria-hidden
        >
          <defs>
            <linearGradient
              id={`road-${gradId}`}
              x1="0"
              y1="0"
              x2="0"
              y2={layout.h}
              gradientUnits="userSpaceOnUse"
            >
              {stops.map((s, i) => (
                <stop key={s.key} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={s.c1} />
              ))}
            </linearGradient>
          </defs>

          {layout.connectors.map((conn, i) => (
            <path
              key={`conn-${stops[i].key}`}
              d={conn.d}
              stroke={conn.c1}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.45}
            />
          ))}

          <path
            d={layout.spinePath}
            stroke={`url(#road-${gradId})`}
            strokeWidth={12}
            strokeLinecap="round"
            opacity={0.16}
          />
          <path d={layout.spinePath} stroke="var(--edge)" strokeWidth={3} strokeLinecap="round" />
          <path
            className="roadmap-road-path"
            d={layout.spinePath}
            stroke={`url(#road-${gradId})`}
            strokeWidth={3}
            strokeLinecap="round"
          />

          <g className="roadmap-traveller hidden lg:block">
            <circle r={8} fill={`url(#road-${gradId})`} opacity={0.4}>
              <animateMotion dur="8s" repeatCount="indefinite" path={layout.spinePath} />
            </circle>
            <circle r={3.5} fill="#fff">
              <animateMotion dur="8s" repeatCount="indefinite" path={layout.spinePath} />
            </circle>
          </g>
        </svg>
      ) : null}

      {/* start */}
      <div
        ref={startRef}
        className="roadmap-row grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-x-1 pb-1 sm:grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)]"
      >
        <div />
        <div className="relative z-10 flex justify-center">
          <span className="grid h-8 w-8 place-items-center rounded-xl border-2 border-bg bg-panel shadow-[var(--shadow-md)] sm:h-9 sm:w-9">
            <EagleMark className="h-6 w-6 rounded-lg sm:h-7 sm:w-7" />
          </span>
        </div>
        <div className="flex min-w-0 items-center pl-1">
          <span className="truncate rounded-full border border-edge bg-panel/70 px-1.5 py-px text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-ink2 backdrop-blur">
            The journey
          </span>
        </div>
      </div>

      {/* stops */}
      <div className="relative">
        {stops.map((stop, i) => (
          <StopRow
            key={stop.key}
            stop={stop}
            index={i}
            cardRef={setCardRef(i)}
            dotRef={setDotRef(i)}
          />
        ))}
      </div>

      {/* finish */}
      <div
        ref={finishRef}
        className="roadmap-row grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-x-1 pt-1 sm:grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)]"
      >
        <div />
        <div className="relative z-10 flex justify-center">
          <span
            className="grid h-8 w-8 place-items-center rounded-full border-2 border-bg text-white shadow-[var(--shadow-md)] sm:h-9 sm:w-9 [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4"
            style={{ background: 'linear-gradient(135deg, #ffd24a, #ff8a1a)' }}
          >
            <Trophy />
          </span>
        </div>
        <div className="flex min-w-0 items-center pl-1">
          <span className="truncate rounded-full border border-edge bg-panel/70 px-1.5 py-px text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-ink2 backdrop-blur">
            Mastery
          </span>
        </div>
      </div>
    </div>
  );
}
