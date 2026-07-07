import type { Frame } from '../core/types';
import type { EffectPlugin } from '../core/effectTypes';
import { defineEffect } from '../core/effectTypes';

export interface FastData {
  factor: number;
}

export interface SlowData {
  factor: number;
}

export interface ReverseData {
  enabled: boolean;
}

export interface PalindromeData {
  enabled: boolean;
}

export interface LateData {
  skip: number;
}

export interface MaskData {
  probability: number;
  seed: number;
}

export interface PlyData {
  times: number;
}

export interface AdsrData {
  attack: number;
  release: number;
}

function sampleEveryN(frames: Frame[], n: number): Frame[] {
  if (n <= 1) return frames;
  return frames.filter((_, i) => i % n === 0 || i === frames.length - 1);
}

function duplicateEach(frames: Frame[], n: number): Frame[] {
  if (n <= 1) return frames;
  const out: Frame[] = [];
  for (const f of frames) {
    for (let i = 0; i < n; i++) out.push(f);
  }
  return out;
}

function seededRandom(seed: number, i: number): number {
  const x = Math.sin(seed * 9999 + i * 7919) * 10000;
  return x - Math.floor(x);
}

export const fastEffect = defineEffect<FastData>({
  meta: { id: 'fast', title: 'Fast', category: 'time' },
  defaultData: { factor: 2 },
  transformFrames: (frames, { factor }) => sampleEveryN(frames, Math.max(1, Math.round(factor))),
  traceSnippet: ({ factor }) => `fast(×${factor})`,
});

export const slowEffect = defineEffect<SlowData>({
  meta: { id: 'slow', title: 'Slow', category: 'time' },
  defaultData: { factor: 2 },
  transformFrames: (frames, { factor }) => duplicateEach(frames, Math.max(1, Math.round(factor))),
  traceSnippet: ({ factor }) => `slow(÷${factor})`,
});

export const reverseEffect = defineEffect<ReverseData>({
  meta: { id: 'reverse', title: 'Reverse', category: 'time' },
  defaultData: { enabled: true },
  transformFrames: (frames, { enabled }) => (enabled ? [...frames].reverse() : frames),
  traceSnippet: () => 'rev()',
});

export const palindromeEffect = defineEffect<PalindromeData>({
  meta: { id: 'palindrome', title: 'Palindrome', category: 'time' },
  defaultData: { enabled: true },
  transformFrames: (frames, { enabled }) => {
    if (!enabled || frames.length <= 1) return frames;
    const tail = [...frames].slice(1).reverse();
    return [...frames, ...tail];
  },
  traceSnippet: () => 'palindrome()',
});

export const lateEffect = defineEffect<LateData>({
  meta: { id: 'late', title: 'Late', category: 'time' },
  defaultData: { skip: 1 },
  transformFrames: (frames, { skip }) => frames.slice(Math.max(0, skip)),
  traceSnippet: ({ skip }) => `late(+${skip})`,
});

export const maskEffect = defineEffect<MaskData>({
  meta: { id: 'mask', title: 'Mask', category: 'drill' },
  defaultData: { probability: 0.5, seed: 42 },
  transformFrames: (frames, { probability, seed }) =>
    frames.filter(
      (_, i) => seededRandom(seed, i) < probability || i === 0 || i === frames.length - 1,
    ),
  traceSnippet: ({ probability }) => `mask(${Math.round(probability * 100)}%)`,
});

export const plyEffect = defineEffect<PlyData>({
  meta: { id: 'ply', title: 'Ply', category: 'drill' },
  defaultData: { times: 2 },
  transformFrames: (frames, { times }) => duplicateEach(frames, Math.max(1, times)),
  traceSnippet: ({ times }) => `ply(×${times})`,
});

export const adsrEffect = defineEffect<AdsrData>({
  meta: { id: 'adsr', title: 'Gate', category: 'emphasis' },
  defaultData: { attack: 0, release: 0 },
  transformFrames: (frames, { attack, release }) => {
    const start = Math.max(0, attack);
    const end = Math.max(start, frames.length - release);
    return frames.slice(start, end || frames.length);
  },
  traceSnippet: ({ attack, release }) => `gate(${attack}…${release})`,
});

export const EFFECTS: EffectPlugin<any>[] = [
  fastEffect,
  slowEffect,
  reverseEffect,
  palindromeEffect,
  lateEffect,
  maskEffect,
  plyEffect,
  adsrEffect,
];

const effectMap = new Map(EFFECTS.map((e) => [e.meta.id, e]));

export function getEffect(id: string): EffectPlugin | undefined {
  return effectMap.get(id);
}

export function isKnownEffectId(id: string): boolean {
  return effectMap.has(id);
}

export function applyEffect(id: string, frames: Frame[], data: unknown): Frame[] {
  const effect = effectMap.get(id);
  if (!effect) return frames;
  const merged = {
    ...(effect.defaultData as object),
    ...(data && typeof data === 'object' ? data : {}),
  };
  return effect.transformFrames(frames, merged);
}

export function effectTraceSnippet(id: string, data: unknown): string {
  const effect = effectMap.get(id);
  if (!effect) return id;
  const merged = {
    ...(effect.defaultData as object),
    ...(data && typeof data === 'object' ? data : {}),
  };
  return effect.traceSnippet(merged);
}

export type EffectDataMap = {
  fast: FastData;
  slow: SlowData;
  reverse: ReverseData;
  palindrome: PalindromeData;
  late: LateData;
  mask: MaskData;
  ply: PlyData;
  adsr: AdsrData;
};
