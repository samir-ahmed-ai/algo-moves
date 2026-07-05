import type { LayoutPreset } from '@/shell/canvas';
import type { CanvasMode } from '../core';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

/** Built-in workflow presets — layout + mode actions (no encoded blob required). */
export interface WorkflowPresetAction {
  id: string;
  label: string;
  description: string;
  mode: CanvasMode;
  layoutPreset: LayoutPreset;
  /** Optional panels to ensure visible (removed list cleared for these). */
  ensurePanels?: string[];
}

export const WORKFLOW_PRESET_ACTIONS: WorkflowPresetAction[] = [
  {
    id: 'trace',
    label: 'Trace study',
    description: 'Problem + viz + replay focus',
    mode: 'visualize',
    layoutPreset: 'TraceFocus',
    ensurePanels: ['replay', 'inspector'],
  },
  {
    id: 'exam',
    label: 'Exam mode',
    description: 'Minimal panels for timed practice',
    mode: 'visualize',
    layoutPreset: 'Minimal',
  },
  {
    id: 'compare',
    label: 'Compare',
    description: 'Visualizer with frame diff panel',
    mode: 'visualize',
    layoutPreset: 'Full',
    ensurePanels: ['diff'],
  },
  {
    id: 'demo',
    label: 'Demo tour',
    description: 'Theater layout + presentation',
    mode: 'visualize',
    layoutPreset: 'Demo',
  },
  {
    id: 'interview',
    label: 'Interview',
    description: 'Host shares a problem; candidate works with quiz',
    mode: 'visualize',
    layoutPreset: 'Minimal',
    ensurePanels: ['workbench', 'quiz'],
  },
];

const DEMO_KEY = STORAGE_KEYS.DEMO_WORKFLOW;

export function hasSeenDemoWorkflow(): boolean {
  return readStorageText(DEMO_KEY) === '1';
}

export function markDemoWorkflowSeen(): void {
  writeStorageText(DEMO_KEY, '1');
}

/** Default first-visit workflow preset id. */
export const FIRST_VISIT_PRESET_ID = 'demo';
