/**
 * Shared UI + rating primitives for Dojo Hub games. These originated in the
 * Vim Dojo and are re-exported here so game modules depend on one stable path
 * (and so a future rename away from the vim- prefix is a one-file change).
 * The matching CSS classes (vim-overlay, vim-overlay-card, vim-touchpad,
 * vim-touch-key, vim-kbd--new, vim-stars, …) are global in theme.css.
 */
export {
  VimBadge as DojoBadge,
  VimBtn as DojoBtn,
  VimCallout as DojoCallout,
  VimKbd as DojoKbd,
  VimProgressBar as DojoProgressBar,
} from '@/shell/vim/ui/vimUi';
export type { VimBadgeTone as DojoBadgeTone } from '@/shell/vim/ui/vimUi';
export { StarRating } from '@/shell/vim/ui/StarRating';
export { starsForMoves, type VimStars as DojoStars } from '@/shell/vim/engine/levels';
