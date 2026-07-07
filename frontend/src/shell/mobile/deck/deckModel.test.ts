import { describe, it, expect } from 'vitest';
import { catalog } from '../../../content';
import { loadPlugin } from '../../../core';
import { parseQuizChoiceLabel } from '@/lib/quiz';
import { buildDeck, deckSummary } from './deckModel';

describe('deckModel', () => {
  it('buildDeck puts gist first, then animate, then quiz, then reassemble', async () => {
    const topic = catalog.getTopic('placement');
    expect(topic).toBeDefined();
    const deck = await buildDeck(topic!);
    expect(deck.blocks.length).toBeGreaterThan(0);
    for (const block of deck.blocks) {
      expect(block.cards[0]?.kind).toBe('gist');
      const gist = block.cards[0];
      expect(gist?.kind === 'gist' && gist.gist.length).toBeGreaterThan(0);
      if (!block.plugin.meta.static) {
        expect(block.cards[1]?.kind).toBe('animate');
      }
      const kinds = block.cards.map((c) => c.kind);
      const quizIdx = kinds.indexOf('quiz');
      const asmIdx = kinds.indexOf('reassemble');
      if (quizIdx >= 0 && asmIdx >= 0) expect(quizIdx).toBeLessThan(asmIdx);
    }
  });

  it('skips quiz cards when plugin has no quiz', async () => {
    const topic = catalog.getTopic('placement');
    const deck = await buildDeck(topic!);
    const block = deck.blocks.find((b) => b.item.pluginId === 'n-queens');
    expect(block).toBeDefined();
    const nq = await loadPlugin('n-queens');
    const hasQuiz = (nq?.quiz?.length ?? 0) > 0;
    const quizCards = block!.cards.filter((c) => c.kind === 'quiz');
    expect(quizCards.length).toBe(hasQuiz ? nq!.quiz!.length : 0);
  });

  it('skips reassemble when fewer than two code pieces', async () => {
    const topic = catalog.getTopic('placement');
    const deck = await buildDeck(topic!);
    for (const block of deck.blocks) {
      const asm = block.cards.some((c) => c.kind === 'reassemble');
      const pieces = block.cards.find((c) => c.kind === 'reassemble');
      if (asm)
        expect(pieces && 'pieces' in pieces && pieces.pieces.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('filters items without a resolvable plugin', async () => {
    const topic = catalog.getTopic('placement');
    const deck = await buildDeck(topic!);
    expect(deck.blocks.every((b) => b.plugin.meta.id)).toBe(true);
  });

  // Loads the whole prep group chunk (271 plugins) via the async loader.
  it('deckSummary counts quiz and reassemble coverage', async () => {
    const topic = catalog.getTopic('prep-arrays-all');
    if (!topic) return;
    const summary = await deckSummary(topic);
    expect(summary.problems).toBeGreaterThan(0);
    expect(summary.totalQuiz).toBeGreaterThan(0);
  }, 30000);

  it('n-queens quiz choices parse with headline and detail', async () => {
    const quiz = (await loadPlugin('n-queens'))?.quiz ?? [];
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
