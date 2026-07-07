/**
 * Sub-document collaboration payloads for whiteboard scenes, shared code
 * editors, and shared notes keyed by panel node id.
 */
export const SUBDOC_TAG = '__subdoc' as const;

export type SubDocKind = 'whiteboard' | 'collab-code' | 'notes';

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

export interface NotesPayload {
  text: string;
}

export type SubDocPayload = WhiteboardPayload | EditorPayload | NotesPayload;

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

export interface SubDocNotesPatchOp {
  [SUBDOC_TAG]: 'patch-notes';
  nodeId: string;
  text: string;
  rev: number;
}

export interface SubDocCursorOp {
  [SUBDOC_TAG]: 'cursor';
  nodeId: string;
  kind: SubDocKind;
  x: number;
  y: number;
  line?: number;
  col?: number;
}

export type SubDocOp =
  | SubDocSnapshotOp
  | SubDocWhiteboardPatchOp
  | SubDocEditorPatchOp
  | SubDocNotesPatchOp
  | SubDocCursorOp;

export function isSubDocOp(value: unknown): value is SubDocOp {
  if (value === null || typeof value !== 'object') return false;
  const op = value as Partial<SubDocOp>;
  if (op[SUBDOC_TAG] == null) return false;
  const tag = op[SUBDOC_TAG];
  return (
    tag === 'snapshot' ||
    tag === 'patch-whiteboard' ||
    tag === 'patch-editor' ||
    tag === 'patch-notes' ||
    tag === 'cursor'
  );
}

export function isSubDocEditOp(op: SubDocOp): op is Exclude<SubDocOp, SubDocCursorOp> {
  return op[SUBDOC_TAG] !== 'cursor';
}

function normalizeLanguage(language: string): string {
  return language.trim() || 'javascript';
}

function normalizeRev(rev: number): number {
  return Number.isFinite(rev) ? Math.max(0, Math.round(rev)) : 0;
}

export function emptyWhiteboardPayload(): WhiteboardPayload {
  return { elements: [], appState: {}, files: {} };
}

export function emptyEditorPayload(language = 'javascript'): EditorPayload {
  return { text: '', language: normalizeLanguage(language) };
}

export function emptyNotesPayload(): NotesPayload {
  return { text: '' };
}

export function subDocSignature(docs: Readonly<Record<string, SubDocSnapshot>>): string {
  return Object.entries(docs)
    .filter(([id]) => id.trim().length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, d]) => `${id.trim()}:${d.kind}:${normalizeRev(d.rev)}`)
    .join('|');
}
