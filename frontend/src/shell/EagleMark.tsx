/**
 * EagleMark — the Algo Moves female eagle brand mark.
 *
 * Inline SVG so it renders pixel-crisp at any size with no network round-trip.
 * The female bald eagle: white head & tail, dark body, golden hooked beak,
 * with a subtle crown crest — strong, precise, and graceful.
 *
 * Unique gradient IDs via React.useId() prevent collisions when the mark
 * is rendered multiple times on the same page.
 */

import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

export function EagleMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const bgId = `eb-${uid}`;
  const bodyId = `ebody-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Algo Moves eagle mark"
      role="img"
      className={cn('shrink-0', className)}
    >
      <defs>
        {/* Background: teal gradient matching mint-saas accent */}
        <linearGradient id={bgId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#52c4b4" />
          <stop offset="100%" stopColor="#27877b" />
        </linearGradient>

        {/* Dark body gradient (wings / chest) */}
        <linearGradient id={bodyId} x1="18" y1="18" x2="52" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e6660" />
          <stop offset="100%" stopColor="#0d3530" />
        </linearGradient>
      </defs>

      {/* ── Background ── */}
      <rect width="100" height="100" rx="22" fill={`url(#${bgId})`} />

      {/* ── Dark body: wing fan at left, body mass below ── */}
      {/*
       * The eagle faces RIGHT. The dark plumage of the body is visible
       * at the lower-left — behind and below the white head/neck.
       */}
      <path
        d="M 8 70 C 13 52 17 34 20 18
           C 24 18 28 24 28 37
           C 28 50 24 62 20 73 Z"
        fill={`url(#${bodyId})`}
      />
      {/* Body mass / lower torso */}
      <path
        d="M 18 70 C 24 77 32 86 38 94
           L 52 94
           C 48 80 44 68 44 60
           C 38 56 28 56 22 62 Z"
        fill={`url(#${bodyId})`}
      />

      {/* ── White head + neck (bald eagle) ── */}
      {/*
       * Profile facing RIGHT. Crown at upper-center, forehead arcs forward
       * to the beak root, chin drops to the throat, back of neck curves
       * left to close. The female has a slightly fuller crown than the male.
       */}
      <path
        d="
          M 44 16
          C 56 11, 70 18, 73 29
          C 75 36, 71 44, 65 50
          C 59 56, 52 60, 46 66
          C 42 70, 38 74, 35 78
          C 27 78, 19 67, 17 54
          C 15 41, 19 26, 31 18
          C 36 15, 41 15, 44 16 Z
        "
        fill="white"
      />

      {/* ── Eye: dark iris with highlight ── */}
      <circle cx="62" cy="28" r="6.2" fill="#143d38" />
      <circle cx="62" cy="28" r="4.0" fill="#06201c" />
      {/* catch-light — the mark of a living, alert bird */}
      <circle cx="59.6" cy="25.6" r="1.8" fill="white" opacity="0.9" />

      {/* ── Beak ── */}
      {/*
       * Upper mandible: extends forward-right from the forehead, broad at
       * the root, tapering to a deep hook at the tip — the unmistakable
       * signature of a raptor.
       */}
      <path
        d="
          M 68 22
          L 88 30
          C 93 34, 93 44, 88 49
          C 84 53, 80 50, 78 45
          L 68 40
          L 63 37 Z
        "
        fill="#e8c040"
      />
      {/* Hook-tip shadow — darkens the underside of the recurved point */}
      <path
        d="
          M 88 49
          C 91 55, 88 62, 83 59
          C 79 56, 79 51, 78 45 Z
        "
        fill="#c9a420"
      />
      {/* Lower mandible — shorter, closes below the upper */}
      <path
        d="
          M 63 37
          L 68 40 L 76 44
          C 74 48, 68 51, 63 49
          C 58 47, 57 43, 59 40 Z
        "
        fill="#e8c040"
        opacity="0.85"
      />

      {/* ── Crown crest feathers ── */}
      {/*
       * Female bald eagles are larger than males and often show a slightly
       * fuller crown. Three fine wisps radiate from the top of the head
       * as an elegant feminine marker.
       */}
      <path
        d="M 40 17 L 36 8
           M 48 14 L 46 5
           M 56 15 L 58 6"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
