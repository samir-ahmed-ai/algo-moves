/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, fireEvent, screen } from '@testing-library/react';
import { InterviewPanelTray } from './InterviewPanelTray';

const onAddKind = vi.fn();

vi.mock('@/store/workspace', () => ({
  useWorkspace: vi.fn(),
}));

import { useWorkspace } from '@/store/workspace';

const mockUseWorkspace = vi.mocked(useWorkspace);

const baseCanvasAdd = {
  addableKinds: [
    { id: 'whiteboard', title: 'Whiteboard' },
    { id: 'notes', title: 'Notes' },
    { id: 'collab-code', title: 'Collab Code Studio' },
  ],
  dndKey: 'application/algomove',
  onAddKind,
};

function mockWorkspace(overrides: Partial<ReturnType<typeof useWorkspace>> = {}) {
  mockUseWorkspace.mockReturnValue({
    canvasAdd: baseCanvasAdd,
    canvasVariant: 'interview',
    mode: 'visualize',
    present: false,
    ...overrides,
  } as ReturnType<typeof useWorkspace>);
}

describe('InterviewPanelTray', () => {
  beforeEach(() => {
    onAddKind.mockClear();
  });

  it('renders tray with addable kinds in interview visualize mode', () => {
    mockWorkspace();
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toContain('Interview panels');
    expect(html).toContain('Whiteboard');
    expect(html).toContain('Notes');
    expect(html).toContain('Collab Code Studio');
  });

  it('renders null for plain canvas variant', () => {
    mockWorkspace({ canvasVariant: 'plain' });
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toBe('');
  });

  it('renders null when mode is not visualize', () => {
    mockWorkspace({ mode: 'learn' });
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toBe('');
  });

  it('renders null when present (replay mode)', () => {
    mockWorkspace({ present: true });
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toBe('');
  });

  it('renders null when canvasAdd is null', () => {
    mockWorkspace({ canvasAdd: null });
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toBe('');
  });

  it('renders null when addableKinds is empty', () => {
    mockWorkspace({ canvasAdd: { ...baseCanvasAdd, addableKinds: [] } });
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toBe('');
  });

  it('calls onAddKind when a tray item is clicked', () => {
    mockWorkspace();
    render(<InterviewPanelTray />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Whiteboard' }));
    expect(onAddKind).toHaveBeenCalledWith('whiteboard');
  });
});
