import { BookMarked, FileText, LayoutTemplate, type LucideIcon } from 'lucide-react';

export interface InterviewTool {
  id: 'interview-canvas' | 'plans' | 'resumes';
  icon: LucideIcon;
  title: string;
  subtitle: string;
  c1: string;
  c2: string;
}

export const INTERVIEW_TOOLS: InterviewTool[] = [
  {
    id: 'interview-canvas',
    icon: LayoutTemplate,
    title: 'Interview Canvas',
    subtitle: 'Whiteboard + code studio',
    c1: '#6366f1',
    c2: '#4338ca',
  },
  {
    id: 'plans',
    icon: BookMarked,
    title: 'Plans',
    subtitle: 'Interview prep',
    c1: '#16c79a',
    c2: '#0e9aa5',
  },
  {
    id: 'resumes',
    icon: FileText,
    title: 'Resumes',
    subtitle: 'Template creator',
    c1: '#7c5cff',
    c2: '#2f6bff',
  },
];
