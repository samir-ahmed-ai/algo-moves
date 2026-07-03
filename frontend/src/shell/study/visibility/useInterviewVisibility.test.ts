import { describe, expect, it } from 'vitest';
import { interviewPanelVisibility } from './useInterviewVisibility';

describe('interviewPanelVisibility', () => {
  it('shows everything in solo mode', () => {
    expect(interviewPanelVisibility('hints', 'solo', null)).toBe('visible');
    expect(interviewPanelVisibility('copy', 'solo', null)).toBe('visible');
  });

  it('shows everything in collab mode', () => {
    expect(interviewPanelVisibility('hints', 'collab', 'guest')).toBe('visible');
    expect(interviewPanelVisibility('copy', 'collab', 'guest')).toBe('visible');
  });

  it('shows everything for hosts in interview mode', () => {
    expect(interviewPanelVisibility('hints', 'interview', 'host')).toBe('visible');
    expect(interviewPanelVisibility('copy', 'interview', 'host')).toBe('visible');
    expect(interviewPanelVisibility('source', 'interview', 'host')).toBe('visible');
  });

  it('always hides source from candidates', () => {
    expect(interviewPanelVisibility('source', 'interview', 'guest')).toBe('hidden');
    expect(interviewPanelVisibility('source', 'interview', 'player')).toBe('hidden');
  });

  it('hides hints panels from candidates when hideHints is true', () => {
    const settings = { hideHints: true, hideSolutions: false };
    expect(interviewPanelVisibility('hints', 'interview', 'guest', settings)).toBe('hidden');
    expect(interviewPanelVisibility('pattern', 'interview', 'guest', settings)).toBe('hidden');
    expect(interviewPanelVisibility('glossary', 'interview', 'guest', settings)).toBe('hidden');
  });

  it('shows hints panels when hideHints is false', () => {
    const settings = { hideHints: false, hideSolutions: false };
    expect(interviewPanelVisibility('hints', 'interview', 'guest', settings)).toBe('visible');
    expect(interviewPanelVisibility('pattern', 'interview', 'guest', settings)).toBe('visible');
    expect(interviewPanelVisibility('glossary', 'interview', 'guest', settings)).toBe('visible');
  });

  it('hides solution panels from candidates when hideSolutions is true', () => {
    const settings = { hideHints: false, hideSolutions: true };
    expect(interviewPanelVisibility('copy', 'interview', 'guest', settings)).toBe('hidden');
    expect(interviewPanelVisibility('cheat', 'interview', 'guest', settings)).toBe('hidden');
    expect(interviewPanelVisibility('cheatsheet', 'interview', 'guest', settings)).toBe('hidden');
    expect(interviewPanelVisibility('complexity', 'interview', 'guest', settings)).toBe('hidden');
  });

  it('shows solution panels when hideSolutions is false', () => {
    const settings = { hideHints: false, hideSolutions: false };
    expect(interviewPanelVisibility('copy', 'interview', 'guest', settings)).toBe('visible');
    expect(interviewPanelVisibility('cheatsheet', 'interview', 'guest', settings)).toBe('visible');
  });

  it('defaults hideHints and hideSolutions to true when settings are undefined', () => {
    expect(interviewPanelVisibility('hints', 'interview', 'guest')).toBe('hidden');
    expect(interviewPanelVisibility('copy', 'interview', 'guest')).toBe('hidden');
  });

  it('leaves unrelated panels visible for candidates', () => {
    const settings = { hideHints: true, hideSolutions: true };
    expect(interviewPanelVisibility('whiteboard', 'interview', 'guest', settings)).toBe('visible');
    expect(interviewPanelVisibility('collab-code', 'interview', 'guest', settings)).toBe('visible');
    expect(interviewPanelVisibility('notes', 'interview', 'guest', settings)).toBe('visible');
  });
});
