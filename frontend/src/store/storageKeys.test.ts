import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from './storageKeys';

/**
 * These values are an on-disk contract: every string must stay byte-identical to
 * what shipped before the keys were centralized, or existing users lose saved
 * progress/projects/drafts. Pin them so no refactor can silently change a value.
 */
describe('STORAGE_KEYS', () => {
  it('static keys are byte-identical to their pre-registry values', () => {
    expect(STORAGE_KEYS.PROJECTS).toBe('algo-moves:projects');
    expect(STORAGE_KEYS.PROGRESS).toBe('algo-moves:progress');
    expect(STORAGE_KEYS.PREP_PLAN_ACTIVE).toBe('algo-moves:prep-plan-active');
    expect(STORAGE_KEYS.LAYOUTS).toBe('algo-moves:layouts');
    expect(STORAGE_KEYS.CANVAS_PREFS).toBe('algo-moves:canvas-prefs');
    expect(STORAGE_KEYS.DEFAULTS).toBe('algo-moves:defaults');
    expect(STORAGE_KEYS.LAST_ITEM).toBe('algo-moves:last-item');
    expect(STORAGE_KEYS.EDITOR_PREFS).toBe('algo-moves:editor-prefs');
    expect(STORAGE_KEYS.OVERVIEW_LAYOUT).toBe('algo-moves:overview-layout');
    expect(STORAGE_KEYS.STUDIO_TAB).toBe('algo-moves:studio-tab');
    expect(STORAGE_KEYS.DRAFT_SOFT_RELOAD).toBe('algo-moves:draft-soft-reload');
    expect(STORAGE_KEYS.MOBILE_SESSION).toBe('algo-moves:mobile-session');
    expect(STORAGE_KEYS.SRS_DECK).toBe('algo-moves:srs-deck');
    expect(STORAGE_KEYS.INSTALL_PROMPT_DISMISSED).toBe('algo-moves:install-prompt-dismissed');
    expect(STORAGE_KEYS.SWIPE_QR_DISMISSED).toBe('algo-moves:swipe-qr-dismissed');
    expect(STORAGE_KEYS.COMMAND_PALETTE_RECENTS).toBe('algo-moves:command-palette-recents');
    expect(STORAGE_KEYS.VIM_PROGRESS).toBe('algo-moves:vim-dojo');
    expect(STORAGE_KEYS.DOJO_MUTED).toBe('algo-moves:dojo:muted');
    expect(STORAGE_KEYS.GAMES_LOCALE).toBe('algo-moves:games:locale');
    expect(STORAGE_KEYS.GAMES_NAME).toBe('algo-moves:games:name');
    expect(STORAGE_KEYS.GAMES_MUTED).toBe('algo-moves:games:muted');
    expect(STORAGE_KEYS.GAMES_GUEST_ID).toBe('algo-moves:games:guest-id');
    expect(STORAGE_KEYS.GAMES_PERSONAL_ROOM).toBe('algo-moves:games:personal-room');
    expect(STORAGE_KEYS.GAMES_LOCAL_HISTORY).toBe('algo-moves:games:local-history');
    expect(STORAGE_KEYS.INTERVIEW_HOST_ROOM).toBe('algo-moves:interview-host-room');
    expect(STORAGE_KEYS.DEMO_WORKFLOW).toBe('algo-moves:demo-workflow');
  });

  it('templated keys produce byte-identical strings', () => {
    expect(STORAGE_KEYS.OVERVIEW_VIEW('two-sum')).toBe('algo-moves:overview-view:two-sum');
    expect(STORAGE_KEYS.CODE_PHASE('two-sum', 0)).toBe('algo-moves:code-phase:two-sum:0');
    expect(STORAGE_KEYS.REASSEMBLE_PROGRESS('two-sum', 1)).toBe(
      'algo-moves:reassemble-progress:two-sum:1',
    );
    expect(STORAGE_KEYS.CODE_QUIZ('two-sum', 2)).toBe('algo-moves:code-quiz:two-sum:2');
    expect(STORAGE_KEYS.DRAFT('two-sum', 'recall')).toBe('algo-moves:draft:two-sum:recall');
    expect(STORAGE_KEYS.NOTES('two-sum')).toBe('algo-moves:notes:two-sum');
    expect(STORAGE_KEYS.EDGE_CASES('two-sum')).toBe('algo-moves:edgecases:two-sum');
    expect(STORAGE_KEYS.RUSH_BEST('two-sum', 'recall')).toBe('algo-moves:rush-best:two-sum:recall');
    expect(STORAGE_KEYS.ASSEMBLE_GAME_BEST('rush', 'two-sum:0')).toBe(
      'algo-moves:assemble-best:rush:two-sum:0',
    );
    expect(STORAGE_KEYS.DOJO_PROGRESS('vim-rush')).toBe('algo-moves:dojo:vim-rush');
  });
});
