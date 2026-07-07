/**
 * Single source of truth for every localStorage key in the app.
 *
 * Never inline an `algo-moves:` string anywhere else — declare it here so we keep
 * one collision-free namespace and can audit the entire persisted surface in one
 * place. Changing an existing value silently wipes users' saved data, so treat the
 * string values below as a stable on-disk contract.
 */

const NS = 'algo-moves';
const keyPart = (part: string | number): string => {
  if (typeof part === 'number') return Number.isFinite(part) ? String(Math.round(part)) : '0';
  return part.trim();
};
const k = (...parts: (string | number)[]): string => [NS, ...parts.map(keyPart)].join(':');

export const STORAGE_KEYS = {
  // store / persistence
  PROJECTS: k('projects'),
  PROGRESS: k('progress'),
  PREP_PLAN_ACTIVE: k('prep-plan-active'),

  // store / canvas-layout
  LAYOUTS: k('layouts'),
  CANVAS_PREFS: k('canvas-prefs'),

  // store / workspace
  DEFAULTS: k('defaults'),
  LAST_ITEM: k('last-item'),

  // store / user-prefs
  EDITOR_PREFS: k('editor-prefs'),
  OVERVIEW_LAYOUT: k('overview-layout'),
  OVERVIEW_VIEW: (itemId: string) => k('overview-view', itemId),
  CODE_PHASE: (itemId: string, langIdx: number) => k('code-phase', itemId, langIdx),
  REASSEMBLE_PROGRESS: (itemId: string, langIdx: number) =>
    k('reassemble-progress', itemId, langIdx),
  CODE_QUIZ: (itemId: string, langIdx: number) => k('code-quiz', itemId, langIdx),

  // shell / canvas
  STUDIO_TAB: k('studio-tab'),
  DRAFT: (itemId: string, variant: string | number) => k('draft', itemId, variant),
  /** Session flag set in beforeunload — soft reload restores drafts; hard refresh does not. */
  DRAFT_SOFT_RELOAD: k('draft-soft-reload'),
  NOTES: (itemId: string) => k('notes', itemId),
  EDGE_CASES: (itemId: string) => k('edgecases', itemId),
  RUSH_BEST: (itemId: string, variant: string | number) => k('rush-best', itemId, variant),
  ASSEMBLE_GAME_BEST: (gameId: string, scope: string) => k('assemble-best', gameId, scope),

  // shell / mobile
  MOBILE_SESSION: k('mobile-session'),
  SRS_DECK: k('srs-deck'),
  INSTALL_PROMPT_DISMISSED: k('install-prompt-dismissed'),

  // shell / home
  SWIPE_QR_DISMISSED: k('swipe-qr-dismissed'),

  // shell / workspace
  COMMAND_PALETTE_RECENTS: k('command-palette-recents'),

  // shell / vim
  VIM_PROGRESS: k('vim-dojo'),

  // shell / dojo
  DOJO_PROGRESS: (gameId: string) => k('dojo', gameId),
  DOJO_MUTED: k('dojo', 'muted'),

  // shell / interview
  INTERVIEW_HOST_ROOM: k('interview-host-room'),

  // shell / games
  GAMES_LOCALE: k('games', 'locale'),
  GAMES_NAME: k('games', 'name'),
  GAMES_MUTED: k('games', 'muted'),
  GAMES_GUEST_ID: k('games', 'guest-id'),
  GAMES_PERSONAL_ROOM: k('games', 'personal-room'),
  GAMES_LOCAL_HISTORY: k('games', 'local-history'),

  // data
  DEMO_WORKFLOW: k('demo-workflow'),
} as const;
