import { useCallback, useSyncExternalStore } from 'react';
import { readStorageJson, writeStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

export const EDGE_CASE_LABELS = [
  'Empty input (length 0)',
  'Single element',
  'All elements equal / duplicates',
  'Already in the target order',
  'Reverse / worst-case order',
  'Negative, zero, or very large values',
  'Minimum & maximum bounds',
  'No valid answer exists',
] as const;

export type EdgeCaseLabel = (typeof EDGE_CASE_LABELS)[number];

const EDGE_CASE_SET = new Set<string>(EDGE_CASE_LABELS);

function isEdgeCaseMap(value: unknown): value is Record<string, boolean> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'boolean')
  );
}

function normalizeEdgeCaseLabel(label: string): EdgeCaseLabel | null {
  const normalized = label.trim();
  return EDGE_CASE_SET.has(normalized) ? (normalized as EdgeCaseLabel) : null;
}

function normalizeItemId(itemId: string): string | null {
  const id = itemId.trim();
  return id ? id : null;
}

function normalizeEdgeCases(value: Record<string, boolean>): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const label of EDGE_CASE_LABELS) {
    if (value[label] === true) next[label] = true;
  }
  return next;
}

function keyFor(itemId: string): string | null {
  const id = normalizeItemId(itemId);
  return id ? STORAGE_KEYS.EDGE_CASES(id) : null;
}

function load(itemId: string): Record<string, boolean> {
  const key = keyFor(itemId);
  return key ? normalizeEdgeCases(readStorageJson(key, {}, isEdgeCaseMap)) : {};
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  listeners.forEach((l) => l());
}

export function getEdgeCases(itemId: string): Record<string, boolean> {
  return load(itemId);
}

export function setEdgeCases(itemId: string, next: Record<string, boolean>): void {
  const key = keyFor(itemId);
  if (!key) return;
  writeStorageJson(key, normalizeEdgeCases(next));
  notify();
}

export function toggleEdgeCase(itemId: string, label: string): Record<string, boolean> {
  const edgeCaseLabel = normalizeEdgeCaseLabel(label);
  const prev = load(itemId);
  if (!edgeCaseLabel) return prev;
  const next = { ...prev, [edgeCaseLabel]: !prev[edgeCaseLabel] };
  setEdgeCases(itemId, next);
  return next;
}

export function useEdgeCases(itemId: string): [Record<string, boolean>, (label: string) => void] {
  const done = useSyncExternalStore(
    subscribe,
    () => load(itemId),
    () => load(itemId),
  );
  const toggle = useCallback((label: string) => toggleEdgeCase(itemId, label), [itemId]);
  return [done, toggle];
}
