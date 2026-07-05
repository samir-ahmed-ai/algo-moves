import { useContext } from 'react';
import type { CodeStudioContextValue } from './codeStudioContextStore';
import {
  CodeStudioContentContext,
  CodeStudioDraftContext,
  CodeStudioEditorContext,
  CodeStudioPhaseContext,
} from './codeStudioContextStore';

const MISSING = 'CodeStudio components must be used within CodeStudioProvider';

export function useCodeStudioContent() {
  const ctx = useContext(CodeStudioContentContext);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

export function useCodeStudioPhase() {
  const ctx = useContext(CodeStudioPhaseContext);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

export function useCodeStudioDraft() {
  const ctx = useContext(CodeStudioDraftContext);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

export function useCodeStudioEditor() {
  const ctx = useContext(CodeStudioEditorContext);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

/** Aggregates all slices — prefer slice hooks for narrower subscriptions. */
export function useCodeStudio(): CodeStudioContextValue {
  return {
    ...useCodeStudioContent(),
    ...useCodeStudioPhase(),
    ...useCodeStudioDraft(),
    ...useCodeStudioEditor(),
  };
}
