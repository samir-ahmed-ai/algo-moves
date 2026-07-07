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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function effectId(id: string): string {
  return id.trim().toLowerCase();
}

function positiveInt(value: unknown, fallback = 1): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.round(value))
    : fallback;
}

function nonNegativeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function unitInterval(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function mergeEffectData(effect: EffectPlugin, data: unknown): object {
  return {
    ...(effect.defaultData as object),
    ...(isRecord(data) ? data : {}),
  };
}

export const fastEffect = defineEffect<FastData>({
  meta: { id: 'fast', title: 'Fast', category: 'time' },
  defaultData: { factor: 2 },
  transformFrames: (frames, { factor }) => sampleEveryN(frames, positiveInt(factor, 2)),
  traceSnippet: ({ factor }) => `fast(×${positiveInt(factor, 2)})`,
});

export const slowEffect = defineEffect<SlowData>({
  meta: { id: 'slow', title: 'Slow', category: 'time' },
  defaultData: { factor: 2 },
  transformFrames: (frames, { factor }) => duplicateEach(frames, positiveInt(factor, 2)),
  traceSnippet: ({ factor }) => `slow(÷${positiveInt(factor, 2)})`,
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
  transformFrames: (frames, { skip }) => frames.slice(nonNegativeInt(skip)),
  traceSnippet: ({ skip }) => `late(+${nonNegativeInt(skip)})`,
});

export const maskEffect = defineEffect<MaskData>({
  meta: { id: 'mask', title: 'Mask', category: 'drill' },
  defaultData: { probability: 0.5, seed: 42 },
  transformFrames: (frames, { probability, seed }) =>
    frames.filter((_, i) => {
      const chance = unitInterval(probability, 0.5);
      return seededRandom(finiteNumber(seed, 42), i) < chance || i === 0 || i === frames.length - 1;
    }),
  traceSnippet: ({ probability }) => `mask(${Math.round(unitInterval(probability, 0.5) * 100)}%)`,
});

export const plyEffect = defineEffect<PlyData>({
  meta: { id: 'ply', title: 'Ply', category: 'drill' },
  defaultData: { times: 2 },
  transformFrames: (frames, { times }) => duplicateEach(frames, positiveInt(times, 2)),
  traceSnippet: ({ times }) => `ply(×${positiveInt(times, 2)})`,
});

export const adsrEffect = defineEffect<AdsrData>({
  meta: { id: 'adsr', title: 'Gate', category: 'emphasis' },
  defaultData: { attack: 0, release: 0 },
  transformFrames: (frames, { attack, release }) => {
    const start = nonNegativeInt(attack);
    const end = Math.max(start, frames.length - nonNegativeInt(release));
    return frames.slice(start, end || frames.length);
  },
  traceSnippet: ({ attack, release }) =>
    `gate(${nonNegativeInt(attack)}…${nonNegativeInt(release)})`,
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

const effectMap = new Map(EFFECTS.map((e) => [effectId(e.meta.id), e]));

export function getEffect(id: string): EffectPlugin | undefined {
  return effectMap.get(effectId(id));
}

export function isKnownEffectId(id: string): boolean {
  return effectMap.has(effectId(id));
}

export function applyEffect(id: string, frames: Frame[], data: unknown): Frame[] {
  const effect = getEffect(id);
  if (!effect) return frames;
  return effect.transformFrames(frames, mergeEffectData(effect, data));
}

export function effectTraceSnippet(id: string, data: unknown): string {
  const normalizedId = effectId(id);
  const effect = effectMap.get(normalizedId);
  if (!effect) return normalizedId;
  return effect.traceSnippet(mergeEffectData(effect, data));
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
