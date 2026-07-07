import { useCallback } from 'react';
import { useWorkspaceNavigation } from '@/store/workspace';
import type { InterviewTool } from './interviewToolkit';

/** Navigate to an interview toolkit destination from profile or account menu. */
export function useInterviewToolkitNavigation() {
  const { enterCollabCanvas, enterPlans, enterResumes } = useWorkspaceNavigation();

  return useCallback(
    (id: InterviewTool['id']) => {
      if (id === 'interview-canvas') enterCollabCanvas();
      else if (id === 'plans') enterPlans();
      else enterResumes();
    },
    [enterCollabCanvas, enterPlans, enterResumes],
  );
}
