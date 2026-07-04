// Pure DOM-measurement + fit math for VizFitBox, extracted from nodeui.tsx so the
// scaling logic is isolated from the design-system component and unit-testable.

export const VIZ_FIT_PAD = 4;
/* Cap upscaling so tiny inputs (3-cell arrays) don't blow up into blurry
   oversized boards; 1.5x is the largest scale where text still reads crisp. */
export const VIZ_FIT_MAX_UPSCALE = 1.5;

export const VIZ_MEASURE_SELECTOR =
  '.board-area, .grid-board, .bars, .arow, .queue-tape, svg[role="img"]';

export const VIZ_PRIMITIVE_SELECTOR = '.grid-board, .bars, .arow, svg[role="img"]';

export type VizFitLayout = { scale: number; w: number; h: number; nw: number; nh: number };

/** Pure fit math for VizFitBox (exported for tests). */
export function computeVizFitLayout(
  nw: number,
  nh: number,
  containerWidth: number,
  containerHeight: number,
  pad = VIZ_FIT_PAD,
  maxUpscale = VIZ_FIT_MAX_UPSCALE,
): VizFitLayout {
  const availW = Math.max(1, containerWidth - pad * 2);
  const availH = Math.max(1, containerHeight - pad * 2);
  // Width gets 1px grace: measureIntrinsic concedes a pixel for scrollWidth
  // truncation, and an exact-fit board must keep identity scale (a 0.997
  // transform blurs every glyph) — the overshoot is clipped, not scaled away.
  let scale = Math.min((availW + 1) / nw, availH / nh, maxUpscale);
  if (scale >= 1) {
    // Floor (never round) so the quantized scale can't exceed the fit and
    // overflow the container; 1/8 steps keep resize ticks imperceptible.
    scale = Math.floor(scale * 8) / 8;
  }
  return {
    scale,
    // Ceil so the box never truncates the scaled content's last device pixel
    // (fractional width + overflow:hidden shaved edge borders); clamp to the
    // padded avail because FP can make nw*scale land an epsilon past it.
    w: Math.min(availW, Math.ceil(nw * scale)),
    h: Math.min(availH, Math.ceil(nh * scale)),
    nw,
    nh,
  };
}

function measureIntrinsic(el: HTMLElement): { w: number; h: number } {
  const prevWidth = el.style.width;
  const prevHeight = el.style.height;
  const prevMaxWidth = el.style.maxWidth;
  const mains = el.classList.contains('viz-stage')
    ? [...el.querySelectorAll<HTMLElement>('.viz-stage-main')]
    : [];
  const mainPrevMaxWidths = mains.map((m) => m.style.maxWidth);

  el.style.width = 'max-content';
  el.style.height = 'max-content';
  el.style.maxWidth = 'none';
  for (const main of mains) main.style.maxWidth = 'none';

  // scrollWidth truncates fractional layout widths, so a max-content measure
  // lands up to 1px short of the true intrinsic size. Laying the board out at
  // that truncated width makes any exact-fit flex line (e.g. a stat strip as
  // the widest child) wrap by a sub-pixel. Concede the pixel — but keep 0 as
  // the "layout not ready" sentinel the retry guards key on.
  const sw = el.scrollWidth;
  const w = sw === 0 ? 0 : sw + 1;
  const h = el.scrollHeight;

  el.style.width = prevWidth;
  el.style.height = prevHeight;
  el.style.maxWidth = prevMaxWidth;
  mains.forEach((main, i) => {
    main.style.maxWidth = mainPrevMaxWidths[i] ?? '';
  });

  return { w, h };
}

/** Stage width + main animation height (rail must not inflate vertical footprint). */
export function resolveVizStageMeasureSize(stageWidth: number, mainHeight: number): { w: number; h: number } {
  return { w: stageWidth, h: mainHeight };
}

/** Exported for VizFitBox measurement tests. */
export function resolveMeasureSize(
  target: HTMLElement,
  containerWidth: number,
): { w: number; h: number; boxH: number } {
  const intrinsic = measureIntrinsic(target);
  let nw = target.scrollWidth;
  let nh = target.scrollHeight;
  // `boxH` is the full content height used to size the fit box; `h` is the
  // height the *scale* is derived from. They differ for a staged board: the
  // scale follows the main animation (rail-independent, so the board never
  // rescales as the rail grows), while the box grows to fit the full stage
  // (main + rail) so the rail stays visible.
  let boxH = nh;

  if (target.classList.contains('board-area') || target.classList.contains('viz-stage')) {
    nw = intrinsic.w;
    nh = intrinsic.h;
    boxH = intrinsic.h;
    const main = target.querySelector<HTMLElement>('.viz-stage-main');
    if (main) {
      nh = measureIntrinsic(main).h;
    }
  } else if (nw === 0 || nh === 0) {
    nw = intrinsic.w;
    nh = intrinsic.h;
    boxH = intrinsic.h;
  }

  const hasPrimitive = target.matches(VIZ_PRIMITIVE_SELECTOR)
    || target.querySelector(VIZ_PRIMITIVE_SELECTOR) !== null;
  if (
    !hasPrimitive
    && nw >= containerWidth * 0.95
    && intrinsic.w > 0
    // Strict <: for stage/board targets nw is already intrinsic.w, and this
    // branch must not re-fire there or it clobbers the main-height override.
    && intrinsic.w < nw
  ) {
    nw = intrinsic.w;
    nh = intrinsic.h;
    boxH = intrinsic.h;
  }

  return { w: nw, h: nh, boxH: Math.max(boxH, nh) };
}
