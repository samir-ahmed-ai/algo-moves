import { describe, it, expect } from 'vitest';
import { catalog } from '../../content';
import { getPlugin } from '../../core';
import { parseQuizChoiceLabel } from '../../lib/quizChoiceFormat';
import { buildDeck, deckSummary } from './deckModel';

describe('deckModel', () => {
  it('buildDeck puts animate first, then quiz, then reassemble', () => {
    const topic = catalog.getTopic('placement');
    expect(topic).toBeDefined();
    const deck = buildDeck(topic!);
    expect(deck.blocks.length).toBeGreaterThan(0);
    for (const block of deck.blocks) {
      expect(block.cards[0]?.kind).toBe('animate');
      const kinds = block.cards.map((c) => c.kind);
      const quizIdx = kinds.indexOf('quiz');
      const asmIdx = kinds.indexOf('reassemble');
      if (quizIdx >= 0 && asmIdx >= 0) expect(quizIdx).toBeLessThan(asmIdx);
    }
  });

  it('skips quiz cards when plugin has no quiz', () => {
    const topic = catalog.getTopic('placement');
    const deck = buildDeck(topic!);
    const block = deck.blocks.find((b) => b.item.pluginId === 'n-queens');
    expect(block).toBeDefined();
    const hasQuiz = (getPlugin('n-queens')?.quiz?.length ?? 0) > 0;
    const quizCards = block!.cards.filter((c) => c.kind === 'quiz');
    expect(quizCards.length).toBe(hasQuiz ? getPlugin('n-queens')!.quiz!.length : 0);
  });

  it('skips reassemble when fewer than four code pieces', () => {
    const topic = catalog.getTopic('placement');
    const deck = buildDeck(topic!);
    for (const block of deck.blocks) {
      const asm = block.cards.some((c) => c.kind === 'reassemble');
      const pieces = block.cards.find((c) => c.kind === 'reassemble');
      if (asm) expect(pieces && 'pieces' in pieces && pieces.pieces.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('filters items without a resolvable plugin', () => {
    const topic = catalog.getTopic('placement');
    const deck = buildDeck(topic!);
    expect(deck.blocks.every((b) => b.plugin.meta.id)).toBe(true);
  });

  it('deckSummary counts quiz and reassemble coverage', () => {
    const topic = catalog.getTopic('prep-arrays-all');
    if (!topic) return;
    const summary = deckSummary(topic);
    expect(summary.problems).toBeGreaterThan(0);
    expect(summary.totalQuiz).toBeGreaterThan(0);
  });

  it('n-queens quiz choices parse with headline and detail', () => {
    const quiz = getPlugin('n-queens')?.quiz ?? [];
    expect(quiz.length).toBeGreaterThan(0);
    for (const q of quiz) {
      for (const c of q.choices) {
        const parsed = parseQuizChoiceLabel(c.label);
        expect(parsed.headline.length).toBeGreaterThan(0);
        expect(parsed.detail?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
