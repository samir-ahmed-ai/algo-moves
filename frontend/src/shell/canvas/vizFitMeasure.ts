// Pure DOM-measurement + fit math for VizFitBox, extracted from nodeui.tsx so the
// scaling logic is isolated from the design-system component and unit-testable.

export const VIZ_FIT_PAD = 4;
export const VIZ_FIT_MAX_UPSCALE = Number.POSITIVE_INFINITY;

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
  let scale = Math.min(availW / nw, availH / nh, maxUpscale);
  if (scale >= 1) {
    scale = Math.round(scale * 4) / 4;
  }
  return {
    scale,
    w: nw * scale,
    h: nh * scale,
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

  const w = el.scrollWidth;
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
    && intrinsic.w < nw
  ) {
    nw = intrinsic.w;
    nh = intrinsic.h;
    boxH = intrinsic.h;
  }

  return { w: nw, h: nh, boxH: Math.max(boxH, nh) };
}
