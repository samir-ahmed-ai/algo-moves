import { describe, expect, it } from 'vitest';
import { interviewPanelVisibility } from '@/shell/study/visibility/useInterviewVisibility';

describe('useInterviewVisibility', () => {
  it('hides reference panels for interview guests', () => {
    expect(interviewPanelVisibility('hints', 'interview', 'guest')).toBe('hidden');
    expect(interviewPanelVisibility('viz', 'interview', 'guest')).toBe('visible');
  });

  it('shows all panels for host and solo', () => {
    expect(interviewPanelVisibility('hints', 'interview', 'host')).toBe('visible');
    expect(interviewPanelVisibility('hints', 'solo', 'guest')).toBe('visible');
  });
});
