/**
 * URL routing utilities for the app's deep-link routes (mobile deck, Vim Dojo,
 * Games arcade, workspace). Page names live in the pathname; hash carries
 * per-page state. Pure parse/write helpers — no React, no store, no shell.
 */
export * from './appRoute';
export * from './mobileHash';
export * from './vimHash';
export * from './gamesHash';
