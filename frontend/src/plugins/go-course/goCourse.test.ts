import { describe, expect, it } from 'vitest';
import { GO_TOPICS } from './topics';
import { goCoursePlugins, goCourses } from './index';
import { quizLabelIssues } from '@/lib/quiz';
import { recordTrace } from './anim/codeTrace';

const concepts = GO_TOPICS.flatMap((t) => t.concepts);

describe('go-course content integrity', () => {
  it('has topics and concepts', () => {
    expect(GO_TOPICS.length).toBeGreaterThanOrEqual(1);
    expect(concepts.length).toBeGreaterThanOrEqual(GO_TOPICS.length);
  });

  it('every concept id is unique', () => {
    const ids = concepts.map((c) => c.id);
    expect(new Set(ids).size, 'duplicate concept ids').toBe(ids.length);
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
      expect(c.quiz.length, `${c.id} needs 3+ questions`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every quiz question has exactly one correct choice and 4 choices', () => {
    for (const c of concepts) {
      for (const q of c.quiz) {
        const correct = q.choices.filter((ch) => ch.correct).length;
        expect(correct, `${c.id}·${q.id} must have exactly one correct`).toBe(1);
        expect(q.choices.length, `${c.id}·${q.id} must have 4 choices`).toBe(4);
      }
    }
  });

  it('every quiz choice label meets the headline — detail format', () => {
    const bad: string[] = [];
    for (const c of concepts) {
      for (const q of c.quiz) {
        for (const ch of q.choices) {
          const issue = quizLabelIssues(ch.label);
          if (issue) bad.push(`${c.id}·${q.id}: ${ch.label} (${issue.reason})`);
        }
      }
    }
    expect(bad, bad.slice(0, 12).join('\n')).toEqual([]);
  });

  it('every concept has a design question and model answer', () => {
    for (const c of concepts) {
      expect(c.design.prompt.length, `${c.id} design.prompt`).toBeGreaterThan(0);
      expect(c.design.answer.length, `${c.id} design.answer`).toBeGreaterThan(0);
    }
  });

  it('builds one plugin per concept and one catalog course', () => {
    expect(goCoursePlugins.length).toBe(concepts.length);
    expect(goCourses.length).toBe(1);
    expect(goCourses[0]!.topics.length).toBe(GO_TOPICS.length);
  });
});

describe('go-course narrative walkthroughs', () => {
  it('every concept has a walkthrough of 3+ steps', () => {
    for (const c of concepts) {
      expect(c.walkthrough, `${c.id} missing walkthrough`).toBeDefined();
      expect(c.walkthrough!.length, `${c.id} needs 3+ steps`).toBeGreaterThanOrEqual(3);
    }
  });

  it('recordTrace emits a frame per step (plus intro/recap) with non-empty notes', () => {
    for (const c of concepts) {
      const frames = recordTrace(c);
      expect(frames.length, `${c.id}`).toBe((c.walkthrough?.length ?? 0) + 2);
      for (const f of frames) {
        expect(f.move.note.length, `${c.id} frame note`).toBeGreaterThan(0);
      }
    }
  });
});
