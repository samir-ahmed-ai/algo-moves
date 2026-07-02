import { STORAGE_KEYS } from '@/store/storageKeys';

/** Shared localStorage keys — kept separate to avoid workspace ↔ workspaceContext cycles. */
export const DEFAULTS_KEY = STORAGE_KEYS.DEFAULTS;

/** Last problem opened in the workspace — powers the home page's "Continue". */
export const LAST_ITEM_KEY = STORAGE_KEYS.LAST_ITEM;
