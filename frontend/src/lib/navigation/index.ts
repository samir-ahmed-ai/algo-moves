/**
 * URL-hash routing utilities for the app's deep-link routes (mobile deck, Vim
 * Dojo, Games arcade). Pure parse/write helpers — no React, no store, no shell
 * — so store/ and shell/ can both depend on them without a layering violation.
 */
export * from './mobileHash';
export * from './vimHash';
export * from './gamesHash';
