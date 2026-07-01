import { useEffect, useRef, type CSSProperties } from 'react';
import type { Item } from '../../content';
import { cn } from '../../lib/cn';
import { glyphFor, shapeFor, type ShapeKey } from '../../content/problemShape';

/** Freeze SMIL/CSS motion for reduced-motion users (SMIL ignores CSS rules). */
function useFreezeIfReducedMotion(ref: React.RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      svg.pauseAnimations?.();
    }
  }, [ref]);
}

/**
 * Big, animated hero art for a problem's intro (gist) card in Mobile Mode. Each
 * scene is inner SVG markup drawn in a `0 0 320 200` viewBox and animated with
 * self-contained SMIL, so it needs no extra CSS and stays theme-safe (strokes
 * inherit `currentColor`; focal detail uses `var(--accent)`/`--good`/`--bad`).
 *
 * The four priority categories — backtracking, graphs, binary search, dynamic
 * programming — get a bespoke category scene. Every other problem falls back to
 * its own mnemonic glyph, enlarged over a gently pulsing backdrop, so it still
 * feels custom.
 */
const SCENE_MARKUP: Partial<Record<ShapeKey, string>> = {
  // Backtracking — a token walks the search tree down the solution path; one
  // branch dead-ends (red ✗) and the winning leaf pulses green.
  backtracking: `
    <g stroke="currentColor" stroke-width="2" fill="none" opacity="0.3">
      <path d="M160 36 L90 104 M160 36 L160 104 M160 36 L230 104 M90 104 L60 170 M160 104 L120 170 M160 104 L200 170 M230 104 L262 170"/>
      <circle cx="90" cy="104" r="9" fill="var(--panel)"/>
      <circle cx="230" cy="104" r="9" fill="var(--panel)"/>
      <circle cx="120" cy="170" r="9" fill="var(--panel)"/>
      <circle cx="262" cy="170" r="9" fill="var(--panel)"/>
    </g>
    <path d="M160 36 L160 104 L200 170" stroke="var(--accent)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-dasharray="230" stroke-dashoffset="230">
      <animate attributeName="stroke-dashoffset" values="230;0;0;230" keyTimes="0;0.4;0.85;1" dur="4.2s" repeatCount="indefinite"/>
    </path>
    <circle cx="160" cy="36" r="12" fill="var(--accent)"/>
    <g>
      <circle cx="60" cy="170" r="10" fill="var(--panel)" stroke="var(--bad)" stroke-width="2.5"/>
      <path d="M55 165 l10 10 M65 165 l-10 10" stroke="var(--bad)" stroke-width="2.5" stroke-linecap="round">
        <animate attributeName="opacity" values="0;0;1;1;0.3" keyTimes="0;0.18;0.32;0.55;0.7" dur="4.2s" repeatCount="indefinite"/>
      </path>
    </g>
    <circle cx="200" cy="170" r="12" fill="var(--panel)" stroke="var(--good)" stroke-width="3">
      <animate attributeName="r" values="12;16;12" begin="3.5s;3.5s+4.2s" dur="0.7s" repeatCount="indefinite"/>
    </circle>
    <path d="M193 170 l5 6 l10 -12" stroke="var(--good)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0">
      <animate attributeName="opacity" values="0;0;1;1;0.2" keyTimes="0;0.82;0.9;0.97;1" dur="4.2s" repeatCount="indefinite"/>
    </path>
    <circle r="6.5" fill="var(--accent)">
      <animateMotion path="M160 36 L160 104 L200 170" dur="4.2s" keyPoints="0;0;1;1" keyTimes="0;0.05;0.8;1" calcMode="linear" repeatCount="indefinite"/>
    </circle>
  `,
  // Graphs — a BFS wavefront ripples out from the source node; the rest of the
  // network lights up ring by ring.
  graph: `
    <g stroke="currentColor" stroke-width="2" opacity="0.35" fill="none">
      <path d="M54 152 L122 120 M122 120 L152 58 M122 120 L204 142 M152 58 L236 66 M204 142 L272 108 M236 66 L272 108 M204 142 L262 178"/>
    </g>
    <g fill="none" stroke="var(--accent)" stroke-width="2">
      <circle cx="54" cy="152" r="12"><animate attributeName="r" values="12;170" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="54" cy="152" r="12"><animate attributeName="r" values="12;170" dur="3s" begin="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0" dur="3s" begin="1.5s" repeatCount="indefinite"/></circle>
    </g>
    <g stroke="currentColor" stroke-width="2" fill="var(--panel)">
      <circle cx="122" cy="120" r="10"/><circle cx="152" cy="58" r="10"/><circle cx="204" cy="142" r="10"/>
      <circle cx="236" cy="66" r="10"/><circle cx="272" cy="108" r="10"/><circle cx="262" cy="178" r="10"/>
    </g>
    <g fill="var(--accent)" stroke="none">
      <circle cx="122" cy="120" r="10" opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.16;0.92;1" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="152" cy="58" r="10" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.3;0.4;0.92;1" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="204" cy="142" r="10" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.3;0.4;0.92;1" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="236" cy="66" r="10" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.55;0.65;0.92;1" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="272" cy="108" r="10" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.55;0.65;0.92;1" dur="3s" repeatCount="indefinite"/></circle>
      <circle cx="262" cy="178" r="10" opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.55;0.65;0.92;1" dur="3s" repeatCount="indefinite"/></circle>
    </g>
    <circle cx="54" cy="152" r="13" fill="var(--accent)" stroke="none"/>
    <circle cx="54" cy="152" r="5" fill="var(--panel)" stroke="none"/>
  `,
  // Binary search — the sorted window keeps halving until it clamps onto the
  // target cell, which pulses.
  binarySearch: `
    <g stroke="currentColor" stroke-width="1.5" opacity="0.5">
      <rect x="28" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="52" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="76" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="100" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="124" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="148" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="172" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="196" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="220" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="244" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
      <rect x="268" y="80" width="22" height="40" rx="3" fill="var(--panel)"/>
    </g>
    <rect x="196" y="80" width="22" height="40" rx="3" fill="var(--accent)" fill-opacity="0.25" stroke="var(--accent)" stroke-width="2">
      <animate attributeName="fill-opacity" values="0.1;0.1;0.1;0.55;0.25" keyTimes="0;0.5;0.75;0.9;1" dur="4.5s" repeatCount="indefinite"/>
    </rect>
    <rect y="74" height="52" rx="6" fill="var(--accent)" fill-opacity="0.12" stroke="var(--accent)" stroke-width="2.5">
      <animate attributeName="x" values="27;171;171;195;195;27" keyTimes="0;0.28;0.52;0.76;0.95;1" dur="4.5s" repeatCount="indefinite"/>
      <animate attributeName="width" values="264;120;46;24;24;264" keyTimes="0;0.28;0.52;0.76;0.95;1" dur="4.5s" repeatCount="indefinite"/>
    </rect>
    <g fill="var(--accent)" stroke="none">
      <path d="M0 0 l-8 -12 l16 0 z">
        <animateMotion path="M160 62 L207 62 L207 62 L207 62" keyPoints="0;0.34;0.7;1" keyTimes="0;0.28;0.52;1" calcMode="linear" dur="4.5s" repeatCount="indefinite"/>
      </path>
    </g>
    <path d="M25 140 h264" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <text x="30" y="156" font-size="12" fill="currentColor" opacity="0.45" font-family="ui-sans-serif,system-ui">lo</text>
    <text x="278" y="156" font-size="12" fill="currentColor" opacity="0.45" font-family="ui-sans-serif,system-ui">hi</text>
  `,
  // Dynamic programming — the table fills on a diagonal wavefront, each cell
  // built from its up / left / diagonal neighbours; the answer cell pulses.
  dp: `
    <g stroke="currentColor" stroke-width="1.5" opacity="0.4" fill="none">
      <rect x="44" y="26" width="228" height="148" rx="4"/>
      <path d="M82 26 v148 M120 26 v148 M158 26 v148 M196 26 v148 M234 26 v148 M44 63 h228 M44 100 h228 M44 137 h228"/>
    </g>
    <g fill="var(--accent)" stroke="none">
      <rect x="45" y="27" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.7;0.7;0" keyTimes="0;0.04;0.12;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="83" y="27" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.6;0.6;0" keyTimes="0;0.12;0.2;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="45" y="64" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.6;0.6;0" keyTimes="0;0.12;0.2;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="121" y="27" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.5;0.5;0" keyTimes="0;0.2;0.28;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="83" y="64" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.5;0.5;0" keyTimes="0;0.2;0.28;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="45" y="101" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.5;0.5;0" keyTimes="0;0.2;0.28;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="159" y="27" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.45;0.45;0" keyTimes="0;0.28;0.36;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="121" y="64" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.45;0.45;0" keyTimes="0;0.28;0.36;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="83" y="101" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.45;0.45;0" keyTimes="0;0.28;0.36;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="45" y="138" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.45;0.45;0" keyTimes="0;0.28;0.36;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="197" y="27" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.36;0.44;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="159" y="64" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.36;0.44;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="121" y="101" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.36;0.44;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="83" y="138" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.36;0.44;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="235" y="27" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.44;0.52;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="197" y="64" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.44;0.52;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="159" y="101" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.44;0.52;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="121" y="138" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.4;0.4;0" keyTimes="0;0.44;0.52;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="235" y="64" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.45;0.45;0" keyTimes="0;0.52;0.6;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="197" y="101" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.45;0.45;0" keyTimes="0;0.52;0.6;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="159" y="138" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.45;0.45;0" keyTimes="0;0.52;0.6;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="235" y="101" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.5;0.5;0" keyTimes="0;0.6;0.68;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
      <rect x="197" y="138" width="36" height="35" opacity="0"><animate attributeName="opacity" values="0;0;0.5;0.5;0" keyTimes="0;0.6;0.68;0.94;1" dur="4.5s" repeatCount="indefinite"/></rect>
    </g>
    <g stroke="var(--accent)" stroke-width="2" fill="none" opacity="0.9">
      <path d="M253 118 v-14 M253 118 h-14 M253 118 l-15 -15" stroke-linecap="round"/>
    </g>
    <rect x="235" y="138" width="36" height="35" fill="var(--good)" fill-opacity="0.2" stroke="var(--good)" stroke-width="2.5">
      <animate attributeName="fill-opacity" values="0.2;0.2;0.6;0.2" keyTimes="0;0.68;0.82;1" dur="4.5s" repeatCount="indefinite"/>
    </rect>
    <path d="M245 156 l5 6 l11 -13" stroke="var(--good)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0">
      <animate attributeName="opacity" values="0;0;1;1;0.2" keyTimes="0;0.7;0.78;0.94;1" dur="4.5s" repeatCount="indefinite"/>
    </path>
  `,
};

export function hasBespokeScene(item: Item): boolean {
  return SCENE_MARKUP[shapeFor(item)] != null;
}

export function GistScene({
  item,
  className,
  style,
}: {
  item: Item;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useFreezeIfReducedMotion(ref);
  const scene = SCENE_MARKUP[shapeFor(item)];
  if (scene) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 320 200"
        className={cn('mobile-gist-scene', className)}
        style={style}
        fill="none"
        role="img"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
        dangerouslySetInnerHTML={{ __html: scene }}
      />
    );
  }

  // Fallback: the problem's own mnemonic glyph, enlarged over a pulsing backdrop.
  return (
    <svg
      ref={ref}
      viewBox="0 0 320 200"
      className={cn('mobile-gist-scene', className)}
      style={style}
      fill="none"
      role="img"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <g className="mobile-gist-backdrop" stroke="var(--accent)" strokeWidth={1.5} fill="none">
        <circle cx="160" cy="100" r="50" opacity={0.55} />
        <circle cx="160" cy="100" r="74" opacity={0.35} />
        <circle cx="160" cy="100" r="98" opacity={0.18} />
      </g>
      <g
        transform="translate(112 52) scale(2)"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: glyphFor(item) }}
      />
    </svg>
  );
}
