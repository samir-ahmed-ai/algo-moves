/**
 * Single source of truth for every localStorage key in the app.
 *
 * Never inline an `algo-moves:` string anywhere else — declare it here so we keep
 * one collision-free namespace and can audit the entire persisted surface in one
 * place. Changing an existing value silently wipes users' saved data, so treat the
 * string values below as a stable on-disk contract.
 */

const NS = 'algo-moves';
const k = (...parts: (string | number)[]): string => [NS, ...parts].join(':');

export const STORAGE_KEYS = {
  // store / persistence
  PROJECTS: k('projects'),
  PROGRESS: k('progress'),

  // store / canvas-layout
  LAYOUTS: k('layouts'),
  CANVAS_PREFS: k('canvas-prefs'),

  // store / workspace
  DEFAULTS: k('defaults'),
  LAST_ITEM: k('last-item'),

  // store / user-prefs
  EDITOR_PREFS: k('editor-prefs'),
  CODE_PHASE: (itemId: string, langIdx: number) => k('code-phase', itemId, langIdx),
  REASSEMBLE_PROGRESS: (itemId: string, langIdx: number) => k('reassemble-progress', itemId, langIdx),
  CODE_QUIZ: (itemId: string, langIdx: number) => k('code-quiz', itemId, langIdx),

  // shell / canvas
  STUDIO_TAB: k('studio-tab'),
  DRAFT: (itemId: string, variant: string | number) => k('draft', itemId, variant),
  NOTES: (itemId: string) => k('notes', itemId),
  EDGE_CASES: (itemId: string) => k('edgecases', itemId),
  RUSH_BEST: (itemId: string, variant: string | number) => k('rush-best', itemId, variant),

  // shell / mobile
  MOBILE_SESSION: k('mobile-session'),

  // shell / home
  SWIPE_QR_DISMISSED: k('swipe-qr-dismissed'),

  // shell / vim
  VIM_PROGRESS: k('vim-dojo'),

  // shell / games
  GAMES_LOCALE: k('games', 'locale'),
  GAMES_NAME: k('games', 'name'),
  GAMES_MUTED: k('games', 'muted'),

  // data
  DEMO_WORKFLOW: k('demo-workflow'),
} as const;
