/**
 * Minimal single-frame GIF89a encoder (MVP — one frame, no animation loop).
 * Used by exportRunSnapshot until multi-frame encoding ships.
 */

const GIF_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] as const; // GIF89a

function writeU16LE(buf: number[], value: number) {
  buf.push(value & 0xff, (value >> 8) & 0xff);
}

/** Pack RGBA rows into a 256-entry palette + indexed pixels (median-cut-free quantize). */
function quantizeRgba(data: Uint8ClampedArray, width: number, height: number) {
  const pixels = width * height;
  const palette: number[] = [0, 0, 0];
  const index = new Uint8Array(pixels);
  const map = new Map<string, number>();

  for (let i = 0; i < pixels; i++) {
    const o = i * 4;
    const a = data[o + 3];
    if (a < 128) {
      index[i] = 0;
      continue;
    }
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const key = `${r},${g},${b}`;
    let idx = map.get(key);
    if (idx == null) {
      if (palette.length / 3 >= 256) {
        idx = 0;
      } else {
        idx = palette.length / 3;
        map.set(key, idx);
        palette.push(r, g, b);
      }
    }
    index[i] = idx;
  }

  while (palette.length < 256 * 3) palette.push(0, 0, 0);
  return { palette: new Uint8Array(palette), index };
}

/** LZW compress indexed pixels for GIF image data sub-blocks. */
function lzwEncode(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = end + 1;
  const dict = new Map<string, number>();

  const emit = (code: number, out: number[]) => {
    for (let i = 0; i < codeSize; i++) {
      const bitPos = out.length * 8 + i;
      const byteIdx = Math.floor(bitPos / 8);
      while (out.length <= byteIdx) out.push(0);
      if (code & (1 << i)) out[byteIdx] |= 1 << (bitPos % 8);
    }
  };

  const bits: number[] = [];
  emit(clear, bits);

  let w = String(indices[0]);
  for (let i = 1; i < indices.length; i++) {
    const c = String(indices[i]);
    const wc = w + ',' + c;
    if (dict.has(wc)) {
      w = wc;
      continue;
    }
    emit(dict.get(w) ?? (w.includes(',') ? dict.get(w)! : Number(w)), bits);
    dict.set(wc, nextCode++);
    if (nextCode === 1 << codeSize && codeSize < 12) codeSize++;
    w = c;
  }
  emit(dict.get(w) ?? Number(w), bits);
  emit(end, bits);

  const packed: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8 && i + b < bits.length; b++) byte |= bits[i + b] << b;
    packed.push(byte);
  }

  const subBlocks: number[] = [];
  for (let i = 0; i < packed.length; i += 255) {
    const chunk = packed.slice(i, i + 255);
    subBlocks.push(chunk.length, ...chunk);
  }
  subBlocks.push(0);
  return new Uint8Array(subBlocks);
}

/** Encode RGBA image data as a single-frame GIF. */
export function encodeSingleFrameGif(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const { palette, index } = quantizeRgba(rgba, width, height);
  const minCodeSize = 8;
  const lzw = lzwEncode(index, minCodeSize);

  const out: number[] = [...GIF_MAGIC];
  writeU16LE(out, width);
  writeU16LE(out, height);
  // Global color table flag + 256 colors, 8-bit
  out.push(0xf7, 0x00, 0x00);
  out.push(...palette);

  // Graphic control — no transparency disposal
  out.push(0x21, 0xf9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00);

  // Image descriptor
  out.push(0x2c, 0x00, 0x00, 0x00, 0x00);
  writeU16LE(out, width);
  writeU16LE(out, height);
  out.push(0x00);
  out.push(minCodeSize);
  out.push(...lzw);
  out.push(0x3b); // trailer

  return new Uint8Array(out);
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
