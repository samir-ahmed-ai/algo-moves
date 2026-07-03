import { describe, expect, it } from 'vitest';
import { canEditSubDoc, canMoveCanvasNodes } from './subdocPermissions';

describe('subdocPermissions', () => {
  it('allows solo editing', () => {
    expect(canEditSubDoc({ role: null, session: { kind: 'solo' }, isCollaborating: false }, 'whiteboard')).toBe(true);
  });

  it('blocks spectators', () => {
    expect(
      canEditSubDoc({ role: 'spectator', session: { kind: 'collab' }, isCollaborating: true }, 'collab-code'),
    ).toBe(false);
  });

  it('respects interview guest board flag', () => {
    expect(
      canEditSubDoc(
        {
          role: 'guest',
          session: { kind: 'interview', interview: { hideHints: true, hideSolutions: true, guestCanEditBoard: false } },
          isCollaborating: true,
        },
        'whiteboard',
      ),
    ).toBe(false);
  });

  it('defaults guest node moves to false in interview', () => {
    expect(
      canMoveCanvasNodes({
        role: 'guest',
        session: { kind: 'interview', interview: { hideHints: true, hideSolutions: true } },
        isCollaborating: true,
      }),
    ).toBe(false);
  });
});
