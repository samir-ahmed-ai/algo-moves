export * from '../shell/canvas/canvasTokens';
export {
  EXAMPLES_MIN_H,
  LEGACY_STRUDEL_NODE_W,
  NODE_UI_SCALE,
  PROBLEM_MIN_H,
  STRUDEL_NODE_W,
} from '../shell/canvas/nodeTokens';
export { vizText, vizPad } from '../plugins/_shared/vizTokens';

export type SpaceScale = 1 | 2 | 3 | 4 | 5 | 6;

/** CSS custom property reference for the spacing scale (`--space-1` … `--space-6`). */
export function spacing(n: SpaceScale): `var(--space-${SpaceScale})` {
  return `var(--space-${n})`;
}
