import { describe, expect, it } from 'vitest';
import { encodeSingleFrameGif } from './gifSnapshot';

describe('encodeSingleFrameGif', () => {
  it('writes a GIF89a header and trailer', () => {
    const rgba = new Uint8ClampedArray(4 * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 255;
      rgba[i + 1] = 0;
      rgba[i + 2] = 128;
      rgba[i + 3] = 255;
    }
    const gif = encodeSingleFrameGif(rgba, 2, 2);
    expect(Array.from(gif.slice(0, 6))).toEqual([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(gif[gif.length - 1]).toBe(0x3b);
  });
});
