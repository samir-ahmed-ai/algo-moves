import {
  NAMED_LAYOUT_PRESET_META,
  type NamedLayoutPreset,
} from '@/shell/canvas/layout/layoutPresets';
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

function named(
  id: NamedLayoutPreset,
  mode: CanvasMode,
  ensurePanels?: string[],
): WorkflowPresetAction {
  const meta = NAMED_LAYOUT_PRESET_META[id];
  return {
    id,
    label: meta.label,
    description: meta.description,
    mode,
    layoutPreset: meta.layoutPreset,
    ...(ensurePanels !== undefined ? { ensurePanels } : {}),
  };
}

export const WORKFLOW_PRESET_ACTIONS: WorkflowPresetAction[] = [
  named('study', 'visualize', ['replay', 'inspector']),
  named('exam', 'visualize'),
  {
    id: 'compare',
    label: 'Compare',
    description: 'Visualizer with frame diff panel',
    mode: 'visualize',
    layoutPreset: 'Full',
    ensurePanels: ['diff'],
  },
  named('demo', 'visualize'),
  {
    id: 'reference',
    label: 'Reference',
    description: 'Pattern card + glossary + cheat sheet panels',
    mode: 'visualize',
    layoutPreset: 'TraceFocus',
    ensurePanels: ['pattern', 'glossary', 'cheatsheet'],
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
