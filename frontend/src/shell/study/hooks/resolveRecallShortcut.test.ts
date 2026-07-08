import { describe, expect, it } from 'vitest';
import { resolveRecallShortcut } from './useCodeStudioRecallShortcuts';

/** Build a minimal KeyboardEvent-like object for the pure resolver. */
function key(
  code: string,
  {
    meta = false,
    ctrl = false,
    shift = false,
    alt = false,
    keyChar,
  }: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean; keyChar?: string } = {},
): KeyboardEvent {
  return {
    code,
    key: keyChar ?? code,
    metaKey: meta,
    ctrlKey: ctrl,
    shiftKey: shift,
    altKey: alt,
  } as KeyboardEvent;
}

describe('resolveRecallShortcut', () => {
  it('requires a Cmd/Ctrl modifier', () => {
    expect(resolveRecallShortcut(key('Backslash', { keyChar: '\\' }))).toBeNull();
    expect(resolveRecallShortcut(key('KeyR', { shift: true, keyChar: 'R' }))).toBeNull();
  });

  it('matches ⌘⇧R clear-draft even though Shift makes e.key "R"', () => {
    // The old e.key==='r' && shiftKey guard could never fire; e.code fixes it.
    expect(resolveRecallShortcut(key('KeyR', { meta: true, shift: true, keyChar: 'R' }))).toBe(
      'clear-draft',
    );
    expect(resolveRecallShortcut(key('KeyR', { ctrl: true, shift: true, keyChar: 'R' }))).toBe(
      'clear-draft',
    );
  });

  it('matches ⌘⇧- decrease and ⌘⇧= increase despite shifted characters (_ and +)', () => {
    expect(resolveRecallShortcut(key('Minus', { meta: true, shift: true, keyChar: '_' }))).toBe(
      'font-decrease',
    );
    expect(resolveRecallShortcut(key('Equal', { meta: true, shift: true, keyChar: '+' }))).toBe(
      'font-increase',
    );
  });

  it('matches blind toggle and vim toggle', () => {
    expect(resolveRecallShortcut(key('Backslash', { meta: true, keyChar: '\\' }))).toBe(
      'toggle-blind',
    );
    expect(resolveRecallShortcut(key('KeyV', { meta: true, alt: true, keyChar: 'v' }))).toBe(
      'toggle-vim',
    );
  });

  it('returns null for unrelated chords', () => {
    expect(resolveRecallShortcut(key('KeyS', { meta: true, keyChar: 's' }))).toBeNull();
    expect(resolveRecallShortcut(key('KeyR', { meta: true, keyChar: 'r' }))).toBeNull(); // no shift
  });
});
