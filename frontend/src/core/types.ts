import type { ComponentType } from 'react';

export type Tone = 'default' | 'good' | 'bad';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Move {
  type: string;
  note: string;
  caption: string;
  team?: number;
  tone?: Tone;
}

export interface Frame<S = unknown> {
  move: Move;
  state: S;
}

export interface SampleInput<I = unknown> {
  id: string;
  label: string;
  value: I;
  /** Plain-language note shown in the problem info popover. */
  hint?: string;
}

export interface PluginMeta {
  id: string;
  title: string;
  /** Problem number from the manifest, e.g. "1.6". */
  number?: string;
  difficulty: Difficulty;
  tags: string[];
  source?: string;
  summary: string;
  /**
   * Static plugins render a single frame-independent view (e.g. a design flow
   * diagram) with no meaningful timeline. Transport / playback controls are
   * hidden and autoplay is skipped when this is set.
   */
  static?: boolean;
  /** Design-topic plugin with Architecture diagram + step Walkthrough tabs. */
  designHybrid?: boolean;
}

export interface PluginViewProps<S = unknown> {
  frame: Frame<S>;
  /**
   * Canvas selection, shared with the Inspector. Currently a graph node index;
   * for non-graph problems treat it as any integer "selected element" id. (To
   * fully generalise, parameterise this on a `Sel` type and widen the workspace
   * store from `number | null`.)
   */
  onSelectNode?: (node: number) => void;
  selectedNode?: number | null;
}

export interface PanelProps {
  theme?: 'dark' | 'light';
  density?: 'compact' | 'spacious';
}

export interface InspectorProps<S = unknown> {
  frame: Frame<S> | null;
  selectedNode: number | null;
}

export interface Verdict {
  ok: boolean;
  label: string;
}

/** Top-level canvas modes shown in the HUD. */
export const CANVAS_MODES = ['play', 'learn', 'visualize'] as const;
export type CanvasMode = (typeof CANVAS_MODES)[number];

export type PluginTabMode = CanvasMode | 'practice';
export type CanvasModeParam = CanvasMode | 'code' | string | undefined;

/** Normalize share URL mode strings to a canvas mode. */
export function normalizeCanvasMode(m?: CanvasModeParam): CanvasMode {
  const mode = m?.trim().toLowerCase();
  if (mode === 'learn' || mode === 'code') return 'learn';
  return isCanvasMode(mode) ? mode : 'play';
}

export function isCanvasMode(value: unknown): value is CanvasMode {
  return typeof value === 'string' && (CANVAS_MODES as readonly string[]).includes(value);
}

export interface PluginTab {
  id: string;
  label: string;
  Panel: ComponentType<PanelProps>;
  mode?: PluginTabMode;
  /** Render in the right-side dock for its mode instead of as a canvas node. */
  side?: boolean;
}

export interface PluginCode {
  text: string;
  lang?: string;
  file?: string;
}

export interface CodePiece {
  id: string;
  code: string;
  role: string;
}

export interface QuizChoice {
  label: string;
  correct?: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: QuizChoice[];
  explain: string;
}

export type PluginWire = [sourceId: string, targetId: string, label?: string];

/** Edge wiring between panels per mode. `practice` aliases `learn`. */
export type PluginWires = Partial<Record<CanvasMode | 'practice', PluginWire[]>>;

/**
 * A top-level field of the input value the student may edit to run the algorithm
 * on their own data. `key` indexes into the input object; the Input editor panel
 * renders a control per field and rebuilds the value.
 */
export interface EditableField {
  key: string;
  label: string;
  type: 'numberArray' | 'number' | 'string';
  /** Clamp for `number`/array length and for array element bounds. */
  min?: number;
  max?: number;
}

export interface ProblemPlugin<I = unknown, S = unknown> {
  meta: PluginMeta;
  inputs: SampleInput<I>[];
  record: (input: I) => Frame<S>[];
  View: ComponentType<PluginViewProps<S>>;
  verdict?: ((frames: Frame<S>[]) => Verdict) | undefined;
  tabs?: PluginTab[] | undefined;
  Inspector?: ComponentType<InspectorProps<S>> | undefined;
  /** Raw solution source — the Code mode mounts an editable editor + a copy node from this. */
  code?: PluginCode | undefined;
  /** Additional language ports of the solution; the Code/Copy panels show one tab per language (#71). */
  extraCode?: PluginCode[] | undefined;
  /** Curated ordered blocks for Code Studio reassemble phase; auto-split from `code` when omitted. */
  codePieces?: CodePiece[] | undefined;
  /**
   * Conceptual multiple-choice questions. The Code Studio runs these as its first
   * phase (Quiz → Structure → Recall) and the Learn-mode Quiz tab reuses the same
   * data. Omit to skip the quiz phase for this problem.
   */
  quiz?: QuizQuestion[] | undefined;
  /**
   * Extra edges between this plugin's tab nodes (and shell built-ins) per mode.
   * The shell already wires the built-in panels; declare tab connections here so
   * a plugin's nodes aren't left unwired. Only edges whose endpoints both exist render.
   */
  wires?: PluginWires | undefined;
  /** Fields the student can edit to run the algorithm on custom input (Input editor panel). */
  editable?: EditableField[] | undefined;
  /** Optional visual input builders (pad grid, beat machine, etc.). */
  inputBuilders?: ('pad' | 'beat' | 'arpeggiator' | 'polyrhythm' | 'custom')[] | undefined;
}

export function definePlugin<I, S>(plugin: ProblemPlugin<I, S>): ProblemPlugin<I, S> {
  return plugin;
}
