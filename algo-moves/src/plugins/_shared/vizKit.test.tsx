import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CharCell,
  DpCell,
  DpHeader,
  ExprToken,
  PathDisplay,
  VizCaption,
  VizEmpty,
  VizHint,
  VizInspector,
  VizStatRow,
  captionFromMove,
  makeInspector,
  useFrameState,
  vizText,
} from './vizKit';
import type { Frame } from '../../core/types';

describe('vizText', () => {
  it('references node CSS variables', () => {
    expect(vizText.base).toContain('--node-fs');
    expect(vizText.display).toContain('--viz-display');
    expect(vizText.cell).toContain('--viz-cell');
  });
});

describe('vizKit primitives', () => {
  it('renders caption, hint, empty, inspector shell', () => {
    const html = renderToStaticMarkup(
      <>
        <VizCaption>caption</VizCaption>
        <VizHint>hint</VizHint>
        <VizEmpty />
        <VizInspector>
          <VizStatRow k="k" v={1} />
        </VizInspector>
      </>,
    );
    expect(html).toContain('caption');
    expect(html).toContain('hint');
    expect(html).toContain('No frame.');
    expect(html).toContain('k');
  });

  it('renders path, cell, dp, and expr displays', () => {
    const html = renderToStaticMarkup(
      <>
        <PathDisplay value="()" />
        <CharCell active>A</CharCell>
        <DpHeader>i</DpHeader>
        <DpCell>1</DpCell>
        <ExprToken>1+2</ExprToken>
      </>,
    );
    expect(html).toContain('()');
    expect(html).toContain('A');
    expect(html).toContain('1+2');
  });
});

describe('captionFromMove', () => {
  it('returns move caption or empty string', () => {
    const frame: Frame<{ n: number }> = {
      move: { type: 'INIT', note: 'n=3', caption: 'Start' },
      state: { n: 3 },
    };
    expect(captionFromMove(frame)).toBe('Start');
    expect(captionFromMove(null)).toBe('');
  });
});

describe('makeInspector', () => {
  it('builds an inspector component', () => {
    const Inspector = makeInspector<{ v: number }>((s) => s.v);
    expect(typeof Inspector).toBe('function');
  });
});

describe('useFrameState', () => {
  it('returns state or null', () => {
    const frame: Frame<{ v: number }> = {
      move: { type: 'INIT', note: '', caption: '' },
      state: { v: 1 },
    };
    expect(useFrameState(frame)?.v).toBe(1);
    expect(useFrameState(null)).toBeNull();
  });
});
