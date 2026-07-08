import { describe, expect, it } from 'vitest';
import { GO_TOPICS } from './topics';
import { goCoursePlugins, goCourses } from './index';
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

  it('every concept carries a memory hook and key points to recall', () => {
    for (const c of concepts) {
      expect(c.memorize.length, `${c.id} memorize`).toBeGreaterThan(0);
      expect(c.keyPoints.length, `${c.id} needs key points`).toBeGreaterThanOrEqual(3);
    }
  });

  it('is recall-only: no concept carries quiz or design problems', () => {
    for (const c of concepts) {
      expect('quiz' in c, `${c.id} must not ship a quiz`).toBe(false);
      expect('design' in c, `${c.id} must not ship a design question`).toBe(false);
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
