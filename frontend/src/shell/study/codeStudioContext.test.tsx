/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Frame, ProblemPlugin } from '@/core';
import type { Item } from '@/content';
import { WorkspaceProvider } from '@/store/workspace';
import { CanvasStaticProvider, CanvasFrameProvider } from '@/shell/canvas';
import { CodeStudioProvider } from './CodeStudio';
import {
  useCodeStudio,
  useCodeStudioContent,
  useCodeStudioDraft,
  useCodeStudioEditor,
  useCodeStudioPhase,
} from './hooks/useCodeStudio';

const stubPlugin = {
  meta: { id: 'ctx-test', title: 'Ctx Test' },
  tabs: [],
  wires: {},
  inputs: [{ id: 'a', label: 'Example 1', value: {} }],
  record: () => [{ move: { type: 'INIT', caption: 'Start' }, state: {} }],
  View: () => null,
  code: { text: 'function solve() { return 42; }', lang: 'javascript' },
  quiz: [{ q: 'Pick one', choices: [{ label: 'A', correct: true }], explain: 'Because.' }],
} as unknown as ProblemPlugin<any, any>;

const stubItem: Item = {
  id: 'ctx-test',
  kind: 'problem',
  title: 'Context test',
  difficulty: 'Easy',
  tags: [],
  status: 'todo',
  prereqs: [],
  courseId: '',
  topicId: '',
};

const stubPlayer = {
  index: 0,
  total: 1,
  isPlaying: false,
  next: () => {},
  prev: () => {},
  reset: () => {},
  togglePlay: () => {},
  goTo: () => {},
  speed: 1,
  setSpeed: () => {},
  loopStart: null,
  loopEnd: null,
  setLoopStart: () => {},
  setLoopEnd: () => {},
  clearLoop: () => {},
  breakpoints: new Set<number>(),
  toggleBreakpoint: () => {},
  bookmarks: new Map<number, string>(),
  setBookmark: () => {},
  removeBookmark: () => {},
  reversed: false,
  toggleReverse: () => {},
};

const stubFrame: Frame<any> = { move: { type: 'INIT', note: 'start', caption: 'Start' }, state: {} };

function wrapper({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <CanvasStaticProvider
        value={{
          plugin: stubPlugin,
          item: stubItem,
          inputId: 'a',
          setInputId: () => {},
          customInput: null,
          setCustomInput: () => {},
          inputFrameCounts: new Map(),
          selectedNode: null,
          setSelectedNode: () => {},
        }}
      >
        <CanvasFrameProvider
          value={{
            frames: [stubFrame],
            player: stubPlayer,
            frame: stubFrame,
          }}
        >
          <CodeStudioProvider>{children}</CodeStudioProvider>
        </CanvasFrameProvider>
      </CanvasStaticProvider>
    </WorkspaceProvider>
  );
}

describe('CodeStudio context slices', () => {
  it('content slice exposes reference and variants', () => {
    const { result } = renderHook(() => useCodeStudioContent(), { wrapper });
    expect(result.current.reference).toContain('return 42');
    expect(result.current.variants.length).toBeGreaterThan(0);
  });

  it('phase slice exposes quiz availability', () => {
    const { result } = renderHook(() => useCodeStudioPhase(), { wrapper });
    expect(result.current.hasQuiz).toBe(true);
    expect(result.current.phaseSeq.length).toBeGreaterThan(0);
  });

  it('draft slice exposes draft string', () => {
    const { result } = renderHook(() => useCodeStudioDraft(), { wrapper });
    expect(typeof result.current.draft).toBe('string');
    expect(typeof result.current.score).toBe('number');
  });

  it('editor slice exposes editor prefs', () => {
    const { result } = renderHook(() => useCodeStudioEditor(), { wrapper });
    expect(typeof result.current.editorPrefs.vim).toBe('boolean');
    expect(typeof result.current.copyRef).toBe('function');
    expect(result.current.draftViewRef.current).toBeNull();
    expect(result.current.formatBothRef.current).toBeNull();
    expect(result.current.foldBothRef.current).toBeNull();
  });

  it('useCodeStudio compat merges all slices', () => {
    const { result } = renderHook(() => useCodeStudio(), { wrapper });
    expect(result.current.reference).toContain('return 42');
    expect(result.current.hasQuiz).toBe(true);
    expect(typeof result.current.draft).toBe('string');
    expect(typeof result.current.editorPrefs.vim).toBe('boolean');
  });
});
