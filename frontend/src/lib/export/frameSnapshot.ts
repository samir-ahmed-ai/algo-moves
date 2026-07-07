import { pngBlobToGifBlob } from './gifSnapshot';

export type SnapshotFormat = 'png' | 'gif';

export interface SnapshotOptions {
  /** Filename without extension. */
  filename?: string;
  /** Pixel ratio for retina captures (default 2). */
  pixelRatio?: number;
  /** Background colour passed to html-to-image (default transparent). */
  backgroundColor?: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Capture a DOM subtree as PNG bytes. */
export async function captureElementPng(
  element: HTMLElement,
  opts: Pick<SnapshotOptions, 'pixelRatio' | 'backgroundColor'> = {},
): Promise<Blob> {
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(element, {
    pixelRatio: opts.pixelRatio ?? 2,
    ...(opts.backgroundColor !== undefined ? { backgroundColor: opts.backgroundColor } : {}),
    cacheBust: true,
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Export the current visualization frame as a downloadable snapshot.
 * GIF MVP encodes a single still frame (not animated).
 */
export async function exportRunSnapshot(
  element: HTMLElement,
  format: SnapshotFormat = 'gif',
  opts: SnapshotOptions = {},
): Promise<void> {
  const base = opts.filename ?? `algo-moves-frame-${Date.now()}`;
  const png = await captureElementPng(element, opts);

  if (format === 'png') {
    downloadBlob(png, `${base}.png`);
    return;
  }

  const gif = await pngBlobToGifBlob(png);
  downloadBlob(gif, `${base}.gif`);
}
