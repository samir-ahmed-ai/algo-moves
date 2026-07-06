import { describe, expect, it } from 'vitest';
import { resolveWorkspaceKeyboardAction, type WorkspaceKeyboardSnapshot } from './useWorkspaceKeyboard';

describe('resolveWorkspaceKeyboardAction', () => {
  function action(overrides: Partial<WorkspaceKeyboardSnapshot> = {}) {
    return resolveWorkspaceKeyboardAction({
      key: 'ArrowRight',
      mode: 'play',
      present: false,
      helpOpen: false,
      paletteOpen: false,
      ...overrides,
    });
  }

  it('keeps command palette toggle available inside editable targets', () => {
    expect(action({ key: 'k', metaKey: true, editableTarget: true })).toBe('toggle-palette');
  });

  it('closes the topmost overlay before presentation mode', () => {
    expect(action({ key: 'Escape', paletteOpen: true, helpOpen: true, present: true })).toBe('close-palette');
    expect(action({ key: 'Escape', helpOpen: true, present: true })).toBe('close-help');
    expect(action({ key: 'Escape', present: true })).toBe('exit-presentation');
  });

  it('blocks workspace transport while overlays are open', () => {
    expect(action({ key: 'ArrowRight', paletteOpen: true })).toBe('none');
    expect(action({ key: 'ArrowRight', helpOpen: true })).toBe('none');
  });

  it('routes transport keys outside learn mode only', () => {
    expect(action({ key: 'ArrowRight', mode: 'play' })).toBe('next-frame');
    expect(action({ key: 'ArrowRight', mode: 'learn' })).toBe('none');
  });

  it('routes help and presentation shortcuts', () => {
    expect(action({ key: '?' })).toBe('toggle-help');
    expect(action({ key: '?', helpOpen: true })).toBe('close-help');
    expect(action({ key: 'F' })).toBe('toggle-present');
  });

  it('routes the advertised canvas focus shortcut', () => {
    expect(action({ key: 'C' })).toBe('toggle-focus-canvas');
    expect(action({ key: 'c', editableTarget: true })).toBe('none');
  });

  it('routes sibling problem navigation when available', () => {
    expect(action({ key: '[', mode: 'learn', hasSiblingNav: true })).toBe('prev-problem');
    expect(action({ key: ']', mode: 'play', hasSiblingNav: true })).toBe('next-problem');
    expect(action({ key: '[', hasSiblingNav: false })).toBe('none');
  });

  it('blocks sibling navigation in editable targets and overlays', () => {
    expect(action({ key: '[', hasSiblingNav: true, editableTarget: true })).toBe('none');
    expect(action({ key: ']', hasSiblingNav: true, paletteOpen: true })).toBe('none');
    expect(action({ key: '[', hasSiblingNav: true, helpOpen: true })).toBe('none');
  });
});
