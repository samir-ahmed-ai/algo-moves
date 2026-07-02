/**
 * Canvas teaching-panel widgets used by plugin factories.
 *
 * Intentional import firewall — do NOT delete or inline. Re-exporting here lets
 * `_shared/practice` (and other plugin code) reach these widgets without importing
 * `shell/` directly, keeping the plugin layer decoupled from the shell.
 */
export { VizFitBox, MiniTabs } from '@/shell/canvas/nodeui';
