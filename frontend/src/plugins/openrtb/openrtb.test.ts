import { describe, expect, it } from 'vitest';
import { OPENRTB_TOPICS } from './topics';
import { openrtbPlugins, openrtbCourses } from './index';

const concepts = OPENRTB_TOPICS.flatMap((t) => t.concepts);

describe('openrtb-course content integrity', () => {
  it('has topics and concepts', () => {
    expect(OPENRTB_TOPICS.length).toBeGreaterThanOrEqual(9);
    expect(concepts.length).toBeGreaterThanOrEqual(OPENRTB_TOPICS.length * 3);
  });

  it('every concept id is unique', () => {
    const ids = concepts.map((c) => c.id);
    expect(new Set(ids).size, 'duplicate concept ids').toBe(ids.length);
  });

  it('every concept id starts with ortb-', () => {
    for (const c of concepts) {
      expect(c.id.startsWith('ortb-'), `${c.id} should start with ortb-`).toBe(true);
    }
  });

  it('every concept ships a Go program starting with package main', () => {
    for (const c of concepts) {
      expect(c.code.trim().startsWith('package main'), `${c.id} code must be package main`).toBe(
        true,
      );
    }
  });

  it('every concept has 3+ quiz questions', () => {
    for (const c of concepts) {
      expect(c.quiz, `${c.id} needs a quiz`).toBeDefined();
      expect(c.quiz!.length, `${c.id} needs 3+ questions`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every quiz question has exactly one correct choice and 4 choices', () => {
    for (const c of concepts) {
      for (const q of c.quiz ?? []) {
        const correct = q.choices.filter((ch) => ch.correct).length;
        expect(correct, `${c.id}·${q.id} must have exactly one correct`).toBe(1);
        expect(q.choices.length, `${c.id}·${q.id} must have 4 choices`).toBe(4);
      }
    }
  });

  it('every concept has a design question and model answer', () => {
    for (const c of concepts) {
      expect(c.design, `${c.id} needs a design question`).toBeDefined();
      expect(c.design!.prompt.length, `${c.id} design.prompt`).toBeGreaterThan(0);
      expect(c.design!.answer.length, `${c.id} design.answer`).toBeGreaterThan(0);
    }
  });

  it('every concept has keyPoints', () => {
    for (const c of concepts) {
      expect(c.keyPoints.length, `${c.id} needs keyPoints`).toBeGreaterThanOrEqual(1);
    }
  });

  it('builds one plugin per concept and one catalog course', () => {
    expect(openrtbPlugins.length).toBe(concepts.length);
    expect(openrtbCourses.length).toBe(1);
    expect(openrtbCourses[0]!.topics.length).toBe(OPENRTB_TOPICS.length);
  });

  it('every topic has at least one concept', () => {
    for (const t of OPENRTB_TOPICS) {
      expect(t.concepts.length, `topic ${t.id} has no concepts`).toBeGreaterThanOrEqual(1);
    }
  });
});
