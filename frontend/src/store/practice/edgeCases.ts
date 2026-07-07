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

function isEdgeCaseMap(value: unknown): value is Record<string, boolean> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'boolean')
  );
}

function keyFor(itemId: string) {
  return STORAGE_KEYS.EDGE_CASES(itemId);
}

function load(itemId: string): Record<string, boolean> {
  return readStorageJson(keyFor(itemId), {}, isEdgeCaseMap);
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

export function getEdgeCases(itemId: string): Record<string, boolean> {
  return load(itemId);
}

export function setEdgeCases(itemId: string, next: Record<string, boolean>) {
  writeStorageJson(keyFor(itemId), next);
  notify();
}

export function toggleEdgeCase(itemId: string, label: string): Record<string, boolean> {
  const prev = load(itemId);
  const next = { ...prev, [label]: !prev[label] };
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
