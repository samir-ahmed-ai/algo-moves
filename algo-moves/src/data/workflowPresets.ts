import type { LayoutPreset } from '../shell/canvas/layout';
import type { CanvasMode } from '../core';
import { readStorageText, writeStorageText } from '../lib/storage';

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
    layoutPreset: 'Study',
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
];

const DEMO_KEY = 'algo-moves:demo-workflow';

export function hasSeenDemoWorkflow(): boolean {
  return readStorageText(DEMO_KEY) === '1';
}

export function markDemoWorkflowSeen(): void {
  writeStorageText(DEMO_KEY, '1');
}

/** Default first-visit workflow preset id. */
export const FIRST_VISIT_PRESET_ID = 'demo';
