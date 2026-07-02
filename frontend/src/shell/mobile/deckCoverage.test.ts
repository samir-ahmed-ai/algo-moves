import { describe, it, expect } from 'vitest';
import { catalog } from '../../content';
import { deckSummary } from './deckModel';

/** Dev report: mobile deck coverage per topic (run via `node scripts/check-mobile-decks.mjs`). */
describe('mobile deck coverage report', () => {
  it('prints animate / quiz / reassemble counts per topic', () => {
    const rows: string[] = [];
    let animateOnly = 0;
    let withQuiz = 0;
    let withReassemble = 0;

    for (const course of catalog.courses) {
      for (const topic of course.topics) {
        const s = deckSummary(topic);
        if (s.problems === 0) continue;
        const label =
          s.totalQuiz === 0 && s.withReassemble === 0
            ? 'animate-only'
            : s.totalQuiz > 0 && s.withReassemble > 0
              ? 'full'
              : s.totalQuiz > 0
                ? '+quiz'
                : '+reassemble';
        if (label === 'animate-only') animateOnly += 1;
        if (s.totalQuiz > 0) withQuiz += 1;
        if (s.withReassemble > 0) withReassemble += 1;
        rows.push(
          `${course.title} / ${topic.title}: ${s.problems} problems, ${s.totalQuiz} quiz, ${s.withReassemble} rebuild (${label})`,
        );
      }
    }

    expect(rows.length).toBeGreaterThan(0);
    if (import.meta.env.REPORT_DECK_COVERAGE === '1') {
      // eslint-disable-next-line no-console -- opt-in report for check-mobile-decks
      console.log('\nMobile deck coverage\n' + rows.join('\n'));
      // eslint-disable-next-line no-console
      console.log(
        `\nTopics: ${rows.length} | animate-only: ${animateOnly} | with quiz: ${withQuiz} | with reassemble: ${withReassemble}\n`,
      );
    }
  });

  it('prep arrays and strings topics have full rebuild coverage', () => {
    const arrays = catalog.getTopic('prep-arrays-all');
    const strings = catalog.getTopic('prep-strings-all');
    expect(arrays).toBeDefined();
    expect(strings).toBeDefined();
    const a = deckSummary(arrays!);
    const s = deckSummary(strings!);
    expect(a.withReassemble).toBe(a.problems);
    expect(s.withReassemble).toBe(s.problems);
  });
});
