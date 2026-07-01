/** Viewport width below which Vim Dojo uses mobile single-column layout. */
export const VIM_NARROW_BREAKPOINT = 960;

export function isVimStudioMobile(containerWidth: number): boolean {
  return containerWidth > 0 && containerWidth < VIM_NARROW_BREAKPOINT;
}
