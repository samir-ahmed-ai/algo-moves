/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, fireEvent, screen } from '@testing-library/react';
import { InterviewPanelTray } from './InterviewPanelTray';
import { TOOL_DOCK_STORAGE_KEY, writeToolDockPrefs } from './toolDock';

const onAddKind = vi.fn();
const onAddEffect = vi.fn();

vi.mock('@/store/workspace', () => ({
  useWorkspace: vi.fn(),
}));

vi.mock('@/shell/collab', () => ({
  useCanvasCollabOptional: vi.fn(),
}));

import { useWorkspace } from '@/store/workspace';
import { useCanvasCollabOptional } from '@/shell/collab';

const mockUseWorkspace = vi.mocked(useWorkspace);
const mockUseCollab = vi.mocked(useCanvasCollabOptional);

const baseCanvasAdd = {
  addableKinds: [
    { id: 'whiteboard', title: 'Whiteboard' },
    { id: 'notes', title: 'Notes' },
    { id: 'collab-code', title: 'Collab Code Studio' },
  ],
  addableEffects: [{ id: 'fast', title: 'Fast' }],
  dndKey: 'application/algomove',
  effectDndKey: 'application/algomove-effect',
  onAddKind,
  onAddEffect,
};

function mockWorkspace(overrides: Partial<ReturnType<typeof useWorkspace>> = {}) {
  mockUseWorkspace.mockReturnValue({
    canvasAdd: baseCanvasAdd,
    mode: 'visualize',
    present: false,
    problemFocused: false,
    ...overrides,
  } as ReturnType<typeof useWorkspace>);
}

function collabApi(overrides: Record<string, unknown> = {}) {
  return {
    session: {
      kind: 'interview',
      interview: { guestCanMoveNodes: true },
      interviewRuntime: { locked: false },
    },
    isHost: true,
    ...overrides,
  } as unknown as ReturnType<typeof useCanvasCollabOptional>;
}

describe('InterviewPanelTray (tool dock)', () => {
  beforeEach(() => {
    onAddKind.mockClear();
    onAddEffect.mockClear();
    mockUseCollab.mockReturnValue(null);
    localStorage.removeItem(TOOL_DOCK_STORAGE_KEY);
  });

  it('renders sectioned dock on a standalone visualize canvas with no session', () => {
    mockWorkspace();
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toContain('Tool dock');
    expect(html).toContain('Boards');
    expect(html).toContain('Code');
    expect(html).toContain('Notes');
    expect(html).toContain('Effects');
    expect(html).toContain('Whiteboard');
    expect(html).toContain('Collab Code Studio');
    expect(html).toContain('Fast');
  });

  it('renders on the plain canvas variant (no interview gating)', () => {
    mockWorkspace({ problemFocused: false });
    expect(renderToStaticMarkup(<InterviewPanelTray />)).not.toBe('');
  });

  it('hides on a problem-bound canvas without an active session', () => {
    mockWorkspace({ problemFocused: true });
    expect(renderToStaticMarkup(<InterviewPanelTray />)).toBe('');
  });

  it('shows on a problem-bound canvas while an interview session is active', () => {
    mockWorkspace({ problemFocused: true });
    mockUseCollab.mockReturnValue(collabApi());
    expect(renderToStaticMarkup(<InterviewPanelTray />)).toContain('Tool dock');
  });

  it('shows on a problem-bound canvas while a collab session is active', () => {
    mockWorkspace({ problemFocused: true });
    mockUseCollab.mockReturnValue(collabApi({ session: { kind: 'collab' } }));
    expect(renderToStaticMarkup(<InterviewPanelTray />)).toContain('Tool dock');
  });

  it('renders null when present (replay mode)', () => {
    mockWorkspace({ present: true });
    expect(renderToStaticMarkup(<InterviewPanelTray />)).toBe('');
  });

  it('renders null when mode is not visualize', () => {
    mockWorkspace({ mode: 'learn' });
    expect(renderToStaticMarkup(<InterviewPanelTray />)).toBe('');
  });

  it('renders null when canvasAdd is null', () => {
    mockWorkspace({ canvasAdd: null });
    expect(renderToStaticMarkup(<InterviewPanelTray />)).toBe('');
  });

  it('renders null when there is nothing to add', () => {
    mockWorkspace({
      canvasAdd: { ...baseCanvasAdd, addableKinds: [], addableEffects: [] },
    });
    expect(renderToStaticMarkup(<InterviewPanelTray />)).toBe('');
  });

  it('calls onAddKind when a panel item is clicked', () => {
    mockWorkspace();
    render(<InterviewPanelTray />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Whiteboard' }));
    expect(onAddKind).toHaveBeenCalledWith('whiteboard');
  });

  it('calls onAddEffect when an effect item is clicked', () => {
    mockWorkspace();
    render(<InterviewPanelTray />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Fast' }));
    expect(onAddEffect).toHaveBeenCalledWith('fast');
    expect(onAddKind).not.toHaveBeenCalled();
  });

  it('sets the contract dnd payload on drag start', () => {
    mockWorkspace();
    render(<InterviewPanelTray />);
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: 'Add Whiteboard' }), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/algomove', 'whiteboard');
  });

  it('sets the effect dnd payload on effect drag start', () => {
    mockWorkspace();
    render(<InterviewPanelTray />);
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: 'Add Fast' }), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/algomove-effect', 'fast');
  });

  it('disables items with a lock hint for a locked-out candidate', () => {
    mockWorkspace();
    mockUseCollab.mockReturnValue(
      collabApi({
        isHost: false,
        session: {
          kind: 'interview',
          interview: { guestCanMoveNodes: true },
          interviewRuntime: { locked: true },
        },
      }),
    );
    render(<InterviewPanelTray />);
    const item = screen.getByRole('button', {
      name: 'Whiteboard — Board locked by the host',
    });
    expect((item as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(item);
    expect(onAddKind).not.toHaveBeenCalled();
    expect(screen.getAllByText('Board locked by the host').length).toBeGreaterThan(0);
  });

  it('disables items when the candidate may not move nodes', () => {
    mockWorkspace();
    mockUseCollab.mockReturnValue(
      collabApi({
        isHost: false,
        session: {
          kind: 'interview',
          interview: { guestCanMoveNodes: false },
          interviewRuntime: { locked: false },
        },
      }),
    );
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toContain('Host controls panel placement');
  });

  it('keeps items enabled for the interview host', () => {
    mockWorkspace();
    mockUseCollab.mockReturnValue(collabApi({ isHost: true }));
    render(<InterviewPanelTray />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Notes' }));
    expect(onAddKind).toHaveBeenCalledWith('notes');
  });

  it('restores collapsed rail state from localStorage', () => {
    writeToolDockPrefs({ pos: null, collapsed: true });
    mockWorkspace();
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toContain('Expand tool dock');
    expect(html).not.toContain('Boards');
  });

  it('restores a persisted position', () => {
    writeToolDockPrefs({ pos: { x: 120, y: 64 }, collapsed: false });
    mockWorkspace();
    const html = renderToStaticMarkup(<InterviewPanelTray />);
    expect(html).toContain('left:120px');
    expect(html).toContain('top:64px');
  });

  it('collapse toggle persists to localStorage', () => {
    mockWorkspace();
    render(<InterviewPanelTray />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse tool dock' }));
    const saved = JSON.parse(localStorage.getItem(TOOL_DOCK_STORAGE_KEY) ?? '{}');
    expect(saved.collapsed).toBe(true);
    expect(screen.getByRole('button', { name: 'Expand tool dock' })).toBeTruthy();
  });

  it('double-clicking the grip resets the persisted position', () => {
    writeToolDockPrefs({ pos: { x: 200, y: 100 }, collapsed: false });
    mockWorkspace();
    const { container } = render(<InterviewPanelTray />);
    const grip = container.querySelector('[title*="double-click"]');
    expect(grip).toBeTruthy();
    fireEvent.doubleClick(grip!);
    const saved = JSON.parse(localStorage.getItem(TOOL_DOCK_STORAGE_KEY) ?? '{}');
    expect(saved.pos).toBeNull();
  });

  it('shows a search field only when there are more than 6 items and filters by it', () => {
    mockWorkspace();
    const { unmount } = render(<InterviewPanelTray />);
    expect(screen.queryByLabelText('Filter tools')).toBeNull();
    unmount();

    mockWorkspace({
      canvasAdd: {
        ...baseCanvasAdd,
        addableKinds: [
          ...baseCanvasAdd.addableKinds,
          { id: 'viz', title: 'Visualization' },
          { id: 'metrics', title: 'Metrics' },
          { id: 'inspector', title: 'Inspector' },
        ],
      },
    });
    render(<InterviewPanelTray />);
    const input = screen.getByLabelText('Filter tools');
    fireEvent.change(input, { target: { value: 'metr' } });
    expect(screen.getByRole('button', { name: 'Add Metrics' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add Whiteboard' })).toBeNull();
  });
});
