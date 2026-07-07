import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Frame, ProblemPlugin } from '@/core';
import type { Item } from '@/content';
import { WorkspaceProvider } from '@/store/workspace';
import { CodeStudioProvider } from '@/shell/study/CodeStudio';
import { WorkbenchPanelBody } from './WorkbenchPanelBody';

import { CanvasStaticProvider, CanvasFrameProvider } from '@/shell/canvas';
const stubPlugin = {
  meta: { id: 'test', title: 'Test' },
  tabs: [],
  wires: {},
  inputs: [{ id: 'a', label: 'Example 1', value: {} }],
  record: () => [{ move: { type: 'INIT', caption: 'Start' }, state: {} }],
  View: () => <div data-testid="viz-view">board</div>,
  code: { text: 'function solve() { return 0; }', lang: 'javascript' },
  quiz: [{ q: 'Pick one', choices: [{ label: 'A', correct: true }], explain: 'Because.' }],
} as unknown as ProblemPlugin<any, any>;

const stubItem: Item = {
  id: 'test',
  kind: 'problem',
  title: 'Amount of New Area Painted Each Day',
  difficulty: 'Medium',
  tags: ['Jump Array'],
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

function Harness() {
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
          changedKeys: [],
        }}
      >
        <CodeStudioProvider>
          <WorkbenchPanelBody />
        </CodeStudioProvider>
      </CanvasFrameProvider>
    </CanvasStaticProvider>
    </WorkspaceProvider>
  );
}

describe('WorkbenchPanelBody', () => {
  it('renders problem, visualizer, and code studio sections', () => {
    const html = renderToStaticMarkup(<Harness />);

    expect(html).toContain('workbench');
    expect(html).toContain('Visualizer');
    expect(html).toContain('Code Studio');
    expect(html).toContain('Amount of New Area Painted Each Day');
    expect(html).toContain('Medium');
    expect(html).toContain('board');
    expect(html).toContain('code-studio-quiz');
  });
});
