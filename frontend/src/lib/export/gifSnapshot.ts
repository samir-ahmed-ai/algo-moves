/**
 * Single-frame GIF export via gifenc.
 * Used by exportRunSnapshot until multi-frame encoding ships.
 */

import { GIFEncoder, applyPalette, quantize } from 'gifenc';

/** Encode RGBA image data as a single-frame GIF. */
export function encodeSingleFrameGif(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const palette = quantize(rgba, 256);
  const index = applyPalette(rgba, palette);
  const gif = GIFEncoder();
  gif.writeFrame(index, width, height, { palette });
  gif.finish();
  return gif.bytes();
}

/** Convert a PNG blob to a single-frame GIF via canvas decode. */
export async function pngBlobToGifBlob(png: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(png);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gif = encodeSingleFrameGif(imageData.data, canvas.width, canvas.height);
  bitmap.close();
  return new Blob([gif], { type: 'image/gif' });
}
