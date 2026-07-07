import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

export function EagleMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const bgId = `algo-bg-${uid}`;
  const pathId = `algo-path-${uid}`;
  const glowId = `algo-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Algo Moves brand mark"
      role="img"
      className={cn('algo-mark shrink-0', className)}
    >
      <defs>
        <linearGradient id={bgId} x1="8" y1="6" x2="92" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#123b36" />
          <stop offset="54%" stopColor="#061615" />
          <stop offset="100%" stopColor="#0b2522" />
        </linearGradient>
        <linearGradient id={pathId} x1="17" y1="76" x2="82" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e5fff9" />
          <stop offset="56%" stopColor="#58d1c3" />
          <stop offset="100%" stopColor="#f8d679" />
        </linearGradient>
        <filter id={glowId} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="3.4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.227 0 0 0 0 0.604 0 0 0 0 0.561 0 0 0 0.52 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="100" height="100" rx="24" fill={`url(#${bgId})`} />
      <path
        d="M18 74C30 71 35 63 40 50C45 35 52 22 62 21C73 20 80 31 86 46"
        stroke="#1f5f57"
        strokeWidth="16"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M18 74C30 71 35 63 40 50C45 35 52 22 62 21C73 20 80 31 86 46"
        stroke={`url(#${pathId})`}
        strokeWidth="8"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
      />
      <path
        d="M35 70L49 30C52 23 61 23 64 30L80 72"
        stroke="#e5fff9"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M45 56H70" stroke="#f8d679" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="18" cy="74" r="7.5" fill="#e5fff9" />
      <circle cx="62" cy="21" r="7" fill="#f8d679" />
      <circle cx="86" cy="46" r="7.5" fill="#58d1c3" />
    </svg>
  );
}
