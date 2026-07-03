/**
 * Sub-document collaboration — whiteboard scenes and shared code editors keyed
 * by panel node id. Rides the room relay under `__subdoc` (orthogonal to
 * `__canvas` graph ops and `__quiz` interview answers).
 */
export const SUBDOC_TAG = '__subdoc' as const;

export type SubDocKind = 'whiteboard' | 'collab-code';

/** Serializable whiteboard scene (Excalidraw-compatible shape). */
export interface WhiteboardPayload {
  elements: WhiteboardElement[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export interface WhiteboardElement {
  id: string;
  isDeleted?: boolean;
  version?: number;
  versionNonce?: number;
  [key: string]: unknown;
}

export interface EditorPayload {
  text: string;
  language: string;
  locked?: boolean;
}

export type SubDocPayload = WhiteboardPayload | EditorPayload;

export interface SubDocSnapshot {
  nodeId: string;
  kind: SubDocKind;
  rev: number;
  payload: SubDocPayload;
}

export interface SubDocSnapshotOp {
  [SUBDOC_TAG]: 'snapshot';
  doc: SubDocSnapshot;
}

export interface SubDocWhiteboardPatchOp {
  [SUBDOC_TAG]: 'patch-whiteboard';
  nodeId: string;
  elements: WhiteboardElement[];
  removedIds?: string[];
  rev: number;
}

export interface SubDocEditorPatchOp {
  [SUBDOC_TAG]: 'patch-editor';
  nodeId: string;
  text: string;
  language: string;
  rev: number;
}

export interface SubDocCursorOp {
  [SUBDOC_TAG]: 'cursor';
  nodeId: string;
  kind: SubDocKind;
  x: number;
  y: number;
  /** Code editor: 1-based line for caret overlay. */
  line?: number;
  col?: number;
}

export type SubDocOp =
  | SubDocSnapshotOp
  | SubDocWhiteboardPatchOp
  | SubDocEditorPatchOp
  | SubDocCursorOp;

export function isSubDocOp(value: unknown): value is SubDocOp {
  const op = value as Partial<SubDocOp> | null;
  if (!op || op[SUBDOC_TAG] == null) return false;
  const tag = op[SUBDOC_TAG];
  return (
    tag === 'snapshot' ||
    tag === 'patch-whiteboard' ||
    tag === 'patch-editor' ||
    tag === 'cursor'
  );
}

export function isSubDocEditOp(op: SubDocOp): op is Exclude<SubDocOp, SubDocCursorOp> {
  return op[SUBDOC_TAG] !== 'cursor';
}

export function emptyWhiteboardPayload(): WhiteboardPayload {
  return { elements: [], appState: {}, files: {} };
}

export function emptyEditorPayload(language = 'javascript'): EditorPayload {
  return { text: '', language };
}

export function subDocSignature(docs: Record<string, SubDocSnapshot>): string {
  return Object.entries(docs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, d]) => `${id}:${d.kind}:${d.rev}`)
    .join('|');
}
