import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  Code2,
  Gamepad2,
  GraduationCap,
  Keyboard,
  Megaphone,
  Target,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { EagleMark } from '@/shell/EagleMark';

/* --------------------------------------------------------------- artwork */

type ArtKind = 'interview' | 'problems' | 'tracks' | 'learn' | 'vim' | 'games';

/**
 * Big, vibrant, theme-independent inline SVG illustration for a roadmap stop.
 * Each stop carries its own two-colour gradient so the journey reads as a
 * bright, hand-drawn map rather than flat monochrome chrome.
 */
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

      {/* wash backdrop */}
      <rect x="0" y="0" width="128" height="96" rx="16" fill={`url(#${soft})`} />
      <circle cx="40" cy="34" r="46" fill={`url(#${glow})`} />

      {kind === 'interview' && (
        <g>
          <circle cx="52" cy="48" r="30" stroke={`url(#${g})`} strokeWidth="4" opacity="0.55" />
          <circle cx="52" cy="48" r="20" stroke={`url(#${g})`} strokeWidth="4" opacity="0.8" />
          <circle cx="52" cy="48" r="8" fill={`url(#${g})`} />
          <path d="M78 20 L104 24 L98 40 L84 34 Z" fill={`url(#${g})`} />
          <path d="M84 34 L52 48" stroke={c2} strokeWidth="4" strokeLinecap="round" />
          <path d="M92 60 h22 M92 70 h16" stroke={c1} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          <path d="M84 62 l4 4 l7 -8" stroke={c2} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}

      {kind === 'problems' && (
        <g>
          <rect x="18" y="22" width="92" height="56" rx="10" fill={`url(#${soft})`} stroke={`url(#${g})`} strokeWidth="3" />
          <circle cx="28" cy="32" r="2.6" fill={c1} />
          <circle cx="36" cy="32" r="2.6" fill={c2} />
          <circle cx="44" cy="32" r="2.6" fill={c1} opacity="0.6" />
          <path d="M40 46 L30 56 L40 66" stroke={`url(#${g})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M88 46 L98 56 L88 66" stroke={`url(#${g})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M58 44 L52 68" stroke={c2} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M74 44 L68 68" stroke={c1} strokeWidth="4.5" strokeLinecap="round" opacity="0.7" />
        </g>
      )}

      {kind === 'tracks' && (
        <g>
          <path d="M64 82 C64 62 34 58 34 34" stroke={`url(#${g})`} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M64 82 C64 62 96 58 96 34" stroke={c2} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.75" />
          <circle cx="64" cy="82" r="6" fill={`url(#${g})`} />
          <path d="M34 34 v-16 l16 5 -16 6" fill={c1} />
          <path d="M96 34 v-16 l-16 5 16 6" fill={c2} />
          <circle cx="34" cy="34" r="5" fill={c1} />
          <circle cx="96" cy="34" r="5" fill={c2} />
        </g>
      )}

      {kind === 'learn' && (
        <g>
          <path d="M40 30 L84 24 M40 30 L58 62 M84 24 L58 62 M84 24 L100 54 M58 62 L100 54" stroke={`url(#${g})`} strokeWidth="3" opacity="0.6" />
          <circle cx="40" cy="30" r="7" fill={`url(#${g})`} />
          <circle cx="84" cy="24" r="9" fill={`url(#${g})`} />
          <circle cx="58" cy="62" r="7" fill={c2} />
          <circle cx="100" cy="54" r="6" fill={c1} />
          <path d="M80 22 l7 4 l-7 4 Z" fill="#fff" opacity="0.9" />
        </g>
      )}

      {kind === 'vim' && (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <rect key={`t${i}`} x={26 + i * 20} y="30" width="16" height="16" rx="4" fill={`url(#${soft})`} stroke={`url(#${g})`} strokeWidth="2.5" />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <rect key={`b${i}`} x={26 + i * 20} y="52" width="16" height="16" rx="4" fill={i === 0 ? `url(#${g})` : `url(#${soft})`} stroke={`url(#${g})`} strokeWidth="2.5" />
          ))}
          <path d="M31 60 l3 3 3 -3 M34 57 v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
          <path d="M92 34 h10 v10" stroke={c2} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}

      {kind === 'games' && (
        <g>
          <rect x="24" y="38" width="80" height="34" rx="17" fill={`url(#${soft})`} stroke={`url(#${g})`} strokeWidth="3" />
          <path d="M42 49 v10 M37 54 h10" stroke={`url(#${g})`} strokeWidth="4" strokeLinecap="round" />
          <circle cx="84" cy="51" r="4" fill={c1} />
          <circle cx="92" cy="59" r="4" fill={c2} />
          <path d="M60 20 l5 12 13 1 -10 8 4 13 -12 -7 -12 7 4 -13 -10 -8 13 -1 Z" fill={`url(#${g})`} opacity="0.9" />
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
  eyebrow: string;
  title: string;
  subtitle: string;
  meta?: string;
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
      eyebrow: 'Start here',
      title: 'Interview Prep',
      subtitle: 'Hand-authored problems across data structures & algorithms — the core track.',
      meta: `${p.prepProblemCount} problems`,
      actions: [{ label: 'Browse prep', onClick: p.onInterviewPrep }],
    },
    {
      key: 'problems',
      kind: 'problems',
      c1: '#21a7ff',
      c2: '#2f6bff',
      icon: <Code2 />,
      eyebrow: 'Practice',
      title: 'Problems',
      subtitle: 'Open any problem with inputs and step through the algorithm move by move.',
      meta: `${p.problemsCount} problems`,
      actions: [{ label: 'Play a problem', onClick: p.onProblems }],
    },
    {
      key: 'tracks',
      kind: 'tracks',
      c1: '#16c79a',
      c2: '#0e9aa5',
      icon: <Megaphone />,
      eyebrow: 'Go deep',
      title: 'Specialized Tracks',
      subtitle: 'Senior Go engineering and OpenRTB ad-platform courses with quizzes and drills.',
      meta: `${p.goConceptCount + p.openrtbConceptCount} concepts`,
      actions: [
        { label: 'Go track', onClick: p.onGo },
        { label: 'OpenRTB', onClick: p.onOpenrtb },
      ],
    },
    {
      key: 'learn',
      kind: 'learn',
      c1: '#ffb020',
      c2: '#ff7a1a',
      icon: <GraduationCap />,
      eyebrow: 'Understand',
      title: 'Learn & Visualize',
      subtitle: 'Replay each algorithm on a live canvas, then reassemble the code in the studio.',
      actions: [
        { label: 'Open studio', onClick: p.onLearn },
        { label: 'Visualize', onClick: p.onVisualize },
      ],
    },
    {
      key: 'vim',
      kind: 'vim',
      c1: '#ff4d94',
      c2: '#7c3aed',
      icon: <Keyboard />,
      eyebrow: 'Level up',
      title: 'Vim Dojo',
      subtitle: 'Master Vim motions in a keyboard-only maze — hjkl until it is muscle memory.',
      actions: [{ label: 'Enter the Dojo', onClick: p.onVim }],
    },
    {
      key: 'games',
      kind: 'games',
      c1: '#ff6b4a',
      c2: '#ff2d55',
      icon: <Gamepad2 />,
      eyebrow: 'Finish line',
      title: 'Games',
      subtitle: 'Challenge your partner in real time — Number Duel and more, head to head.',
      actions: [{ label: 'Start a room', onClick: p.onGames }],
    },
  ];
}

/* ------------------------------------------------------------ curved road */

interface Pt {
  x: number;
  y: number;
}

/** Smooth vertical serpentine through the points — vertical tangents give arcs. */
function buildRoadPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dy = b.y - a.y;
    const c1y = a.y + dy * 0.5;
    const c2y = b.y - dy * 0.5;
    d += ` C ${a.x.toFixed(1)} ${c1y.toFixed(1)}, ${b.x.toFixed(1)} ${c2y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

function StopCard({
  stop,
  index,
  nodeRef,
}: {
  stop: RoadStop;
  index: number;
  nodeRef: (el: HTMLDivElement | null) => void;
}) {
  const side = index % 2 === 0 ? 'left' : 'right';
  const [primary] = stop.actions;

  return (
    <div
      ref={nodeRef}
      className={cn(
        'relative py-1 sm:py-1.5 lg:py-2',
        'pl-[3.25rem] sm:pl-16 lg:pl-0',
        side === 'left' ? 'lg:pr-[calc(50%+32px)]' : 'lg:pl-[calc(50%+32px)]',
      )}
    >
      <button
        type="button"
        onClick={primary.onClick}
        aria-label={primary.label}
        className="roadmap-stop group relative block w-full overflow-hidden rounded-xl border border-edge bg-panel/70 p-2 text-left shadow-[var(--shadow-sm)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
        style={{ '--stop-c1': stop.c1, '--stop-c2': stop.c2, animationDelay: `${index * 90}ms` } as CSSProperties}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-55"
          style={{ background: stop.c1 }}
        />

        <div className="relative mb-1.5 h-14 w-full overflow-hidden rounded-lg border border-edge/70 sm:h-16">
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

        <h3 className="truncate text-center text-xs font-semibold tracking-tight text-ink sm:text-sm">
          {stop.title}
        </h3>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- component */

export function RoadmapCanvas(props: RoadmapCanvasProps) {
  const stops = buildStops(props);
  const gradId = useId().replace(/:/g, '');

  const containerRef = useRef<HTMLDivElement | null>(null);
  // node order: [start, ...stops, finish]
  const nodeRefs = useRef<Array<HTMLElement | null>>([]);
  const [layout, setLayout] = useState<{ w: number; h: number; points: Pt[] }>({
    w: 0,
    h: 0,
    points: [],
  });

  const measure = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    const w = cr.width;
    const h = cr.height;
    const lgLike = w >= 1024;
    const mdLike = w >= 640;
    const cx = lgLike ? w / 2 : mdLike ? 36 : 26;
    const off = lgLike ? Math.min(w * 0.14, 110) : mdLike ? 18 : 12;

    const points: Pt[] = nodeRefs.current.map((el, idx) => {
      const y = el ? el.getBoundingClientRect().top - cr.top + el.offsetHeight / 2 : 0;
      let x = cx;
      if (idx > 0 && idx <= stops.length) {
        const side = (idx - 1) % 2 === 0 ? 'left' : 'right';
        x = cx + (side === 'left' ? -off : off);
      }
      return { x, y };
    });
    setLayout({ w, h, points });
  }, [stops.length]);

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

  const setNodeRef = (idx: number) => (el: HTMLElement | null) => {
    nodeRefs.current[idx] = el;
  };

  const path = buildRoadPath(layout.points);
  const stopPoints = layout.points.slice(1, 1 + stops.length);

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-md px-3 pb-10 pt-3 sm:px-4 sm:pb-12 sm:pt-4 lg:max-w-none">
      {/* the curved road */}
      {layout.w > 0 && path ? (
        <svg
          className="pointer-events-none absolute inset-0"
          width={layout.w}
          height={layout.h}
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          fill="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={`road-${gradId}`} x1="0" y1="0" x2="0" y2={layout.h} gradientUnits="userSpaceOnUse">
              {stops.map((s, i) => (
                <stop key={s.key} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={s.c1} />
              ))}
            </linearGradient>
          </defs>
          {/* soft glow underlay */}
          <path d={path} stroke={`url(#road-${gradId})`} strokeWidth={14} strokeLinecap="round" opacity={0.18} />
          {/* base rail */}
          <path d={path} stroke="var(--edge)" strokeWidth={4} strokeLinecap="round" />
          {/* marching dashed centreline */}
          <path
            className="roadmap-road-path"
            d={path}
            stroke={`url(#road-${gradId})`}
            strokeWidth={4}
            strokeLinecap="round"
          />
          {/* glowing traveller running the whole road — desktop only via CSS */}
          <g className="roadmap-traveller hidden lg:block">
            <circle r={9} fill={`url(#road-${gradId})`} opacity={0.4}>
              <animateMotion dur="8s" repeatCount="indefinite" path={path} rotate="auto" />
            </circle>
            <circle r={4} fill="#fff">
              <animateMotion dur="8s" repeatCount="indefinite" path={path} rotate="auto" />
            </circle>
          </g>
        </svg>
      ) : null}

      {/* numbered milestone dots on the arc */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {stopPoints.map((pt, i) => (
          <span
            key={stops[i].key}
            className="roadmap-dot absolute z-10 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-bg font-mono text-[10px] font-semibold text-white shadow-[var(--shadow-sm)] sm:h-8 sm:w-8 sm:text-[11px]"
            style={{
              left: pt.x,
              top: pt.y,
              background: `linear-gradient(135deg, ${stops[i].c1}, ${stops[i].c2})`,
              '--stop-c1': stops[i].c1,
            } as CSSProperties}
          >
            {i + 1}
          </span>
        ))}
      </div>

      {/* start marker */}
      <div ref={setNodeRef(0)} className="relative mb-0 flex min-h-8 items-center gap-2 pl-[3.25rem] sm:pl-16 lg:justify-center lg:pl-0">
        <span
          aria-hidden
          className="absolute left-[26px] top-1/2 z-10 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border-2 border-bg bg-panel shadow-[var(--shadow-md)] sm:left-[30px] lg:left-1/2"
        >
          <EagleMark className="h-6 w-6 rounded-lg sm:h-7 sm:w-7" />
        </span>
        <span className="rounded-full border border-edge bg-panel/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink2 backdrop-blur lg:ml-12">
          The journey
        </span>
      </div>

      {/* stops */}
      <div className="relative">
        {stops.map((stop, i) => (
          <StopCard key={stop.key} stop={stop} index={i} nodeRef={setNodeRef(i + 1)} />
        ))}
      </div>

      {/* finish marker */}
      <div
        ref={setNodeRef(stops.length + 1)}
        className="relative mt-0 flex min-h-8 items-center gap-2 pl-[3.25rem] sm:pl-16 lg:justify-center lg:pl-0"
      >
        <span
          aria-hidden
          className="absolute left-[26px] top-1/2 z-10 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-bg text-white shadow-[var(--shadow-md)] sm:left-[30px] lg:left-1/2 [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4"
          style={{ background: 'linear-gradient(135deg, #ffd24a, #ff8a1a)' }}
        >
          <Trophy />
        </span>
        <span className="rounded-full border border-edge bg-panel/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink2 backdrop-blur lg:ml-12">
          Mastery
        </span>
      </div>
    </div>
  );
}
