import { describe, expect, it } from 'vitest';
import { Position } from '@xyflow/react';
import { portHandleStyle } from './canvasHandles';

describe('portHandleStyle', () => {
  it('offsets handles outside the node on each side', () => {
    expect(portHandleStyle(Position.Left).transform).toContain('-100%');
    expect(portHandleStyle(Position.Right).transform).toContain('100%');
    expect(portHandleStyle(Position.Top).transform).toContain('-100%');
    expect(portHandleStyle(Position.Bottom).transform).toContain('100%');
  });
});
