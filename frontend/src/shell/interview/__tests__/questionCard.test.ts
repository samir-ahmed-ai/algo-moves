import { describe, expect, it } from 'vitest';
import { buildQuestionCardElements } from '../questionCard';

describe('buildQuestionCardElements', () => {
  it('builds a grouped rectangle + text card', () => {
    const els = buildQuestionCardElements(
      'Explain time complexity of your approach.',
      { x: 100, y: 200 },
      'technical',
    );
    expect(els).toHaveLength(2);
    const [rect, text] = els;
    expect(rect.type).toBe('rectangle');
    expect(text.type).toBe('text');
    // Grouped together so they drag as one.
    expect(rect.groupIds).toEqual(text.groupIds);
    expect((rect.groupIds as string[]).length).toBe(1);
    // Category is prefixed into the visible text.
    expect(String(text.text)).toContain('[technical]');
    expect(String(text.originalText)).toContain('Explain time complexity');
    // Positioned at the requested origin, text padded inside the card.
    expect(rect.x).toBe(100);
    expect(rect.y).toBe(200);
    expect(Number(text.x)).toBeGreaterThan(100);
    expect(Number(text.y)).toBeGreaterThan(200);
  });

  it('produces unique element ids on each call', () => {
    const a = buildQuestionCardElements('q', { x: 0, y: 0 });
    const b = buildQuestionCardElements('q', { x: 0, y: 0 });
    expect(a[0].id).not.toBe(b[0].id);
    expect(a[1].id).not.toBe(b[1].id);
  });
});
