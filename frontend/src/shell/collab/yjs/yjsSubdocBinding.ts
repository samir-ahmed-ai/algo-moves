/**
 * Yjs bindings for panel subdocuments (whiteboard + collab-code).
 *
 * Phase B shadow: full snapshot seed per panel (parity with host relay).
 * Phase B transport: editor uses Y.Text; whiteboard uses per-element Y.Map.
 */
import * as Y from 'yjs';
import type {
  EditorPayload,
  NotesPayload,
  SubDocKind,
  SubDocSnapshot,
  WhiteboardElement,
  WhiteboardPayload,
} from '../protocol/subdocProtocol';
import { snapshotFromPayload } from '../protocol/subdocMerge';

export const YJS_SUBDOC_KEY = 'subdocs' as const;

export function bindSubdocRoot(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(YJS_SUBDOC_KEY);
}

/** Hydrate all subdoc snapshots (shadow dual-write). */
export function seedYjsSubdocs(doc: Y.Doc, subDocs: Record<string, SubDocSnapshot>): void {
  const root = bindSubdocRoot(doc);
  doc.transact(() => {
    for (const id of [...root.keys()]) {
      if (!subDocs[id]) root.delete(id);
    }
    for (const snap of Object.values(subDocs)) {
      seedSubdocPanel(doc, snap);
    }
  });
}

/** Materialize all subdoc snapshots from Yjs. */
export function readYjsSubdocs(doc: Y.Doc): Record<string, SubDocSnapshot> {
  const root = bindSubdocRoot(doc);
  const out: Record<string, SubDocSnapshot> = {};
  for (const [nodeId, panel] of root.entries()) {
    const snap = readSubdocPanelMap(nodeId, panel);
    if (snap) out[nodeId] = snap;
  }
  return out;
}

function panelMap(doc: Y.Doc, nodeId: string, kind: SubDocKind): Y.Map<unknown> {
  const root = bindSubdocRoot(doc);
  let panel = root.get(nodeId);
  if (!panel) {
    panel = new Y.Map<unknown>();
    panel.set('kind', kind);
    root.set(nodeId, panel);
  }
  return panel;
}

function setPanelText(panel: Y.Map<unknown>, next: string): void {
  let text = panel.get('text') as Y.Text | undefined;
  if (!text) {
    text = new Y.Text();
    panel.set('text', text);
  }
  if (text.toString() !== next) {
    text.delete(0, text.length);
    text.insert(0, next);
  }
}

/** Seed one panel snapshot into Yjs. */
export function seedSubdocPanel(doc: Y.Doc, snap: SubDocSnapshot): void {
  doc.transact(() => {
    const panel = panelMap(doc, snap.nodeId, snap.kind);
    panel.set('kind', snap.kind);
    panel.set('rev', snap.rev);
    if (snap.kind === 'collab-code') {
      const payload = snap.payload as EditorPayload;
      setPanelText(panel, payload.text);
      panel.set('language', payload.language);
      if (payload.locked != null) panel.set('locked', payload.locked);
    } else if (snap.kind === 'notes') {
      setPanelText(panel, (snap.payload as NotesPayload).text);
    } else {
      const payload = snap.payload as WhiteboardPayload;
      let elements = panel.get('elements') as Y.Map<WhiteboardElement> | undefined;
      if (!elements) {
        elements = new Y.Map<WhiteboardElement>();
        panel.set('elements', elements);
      }
      const nextIds = new Set(payload.elements.map((e) => e.id));
      for (const id of [...elements.keys()]) {
        if (!nextIds.has(id)) elements.delete(id);
      }
      for (const el of payload.elements) elements.set(el.id, el);
      if (payload.appState) panel.set('appState', payload.appState);
      if (payload.files) panel.set('files', payload.files);
    }
  });
}

function readSubdocPanelMap(nodeId: string, panel: Y.Map<unknown>): SubDocSnapshot | null {
  const kind = panel.get('kind') as SubDocKind | undefined;
  const rev = Number(panel.get('rev') ?? 0);
  if (!kind) return null;

  if (kind === 'collab-code') {
    const text = (panel.get('text') as Y.Text | undefined)?.toString() ?? '';
    const language = String(panel.get('language') ?? 'go');
    const locked = panel.get('locked') as boolean | undefined;
    const payload: EditorPayload = { text, language, ...(locked != null ? { locked } : {}) };
    return snapshotFromPayload(nodeId, kind, rev, payload);
  }

  if (kind === 'notes') {
    const text = (panel.get('text') as Y.Text | undefined)?.toString() ?? '';
    const payload: NotesPayload = { text };
    return snapshotFromPayload(nodeId, kind, rev, payload);
  }

  const elementsMap = panel.get('elements') as Y.Map<WhiteboardElement> | undefined;
  const elements = elementsMap ? [...elementsMap.values()] : [];
  const payload: WhiteboardPayload = {
    elements,
    appState: panel.get('appState') as Record<string, unknown> | undefined,
    files: panel.get('files') as Record<string, unknown> | undefined,
  };
  return snapshotFromPayload(nodeId, kind, rev, payload);
}

export function readSubdocPanel(doc: Y.Doc, nodeId: string): SubDocSnapshot | null {
  const panel = bindSubdocRoot(doc).get(nodeId);
  if (!panel) return null;
  return readSubdocPanelMap(nodeId, panel);
}

export interface EditorSubdocBinding {
  text: Y.Text;
  panel: Y.Map<unknown>;
}

export function bindEditorSubdoc(doc: Y.Doc, nodeId: string): EditorSubdocBinding {
  const panel = panelMap(doc, nodeId, 'collab-code');
  let text = panel.get('text') as Y.Text | undefined;
  if (!text) {
    text = new Y.Text();
    panel.set('text', text);
  }
  return { text, panel };
}

export function writeEditorSubdoc(
  doc: Y.Doc,
  nodeId: string,
  payload: EditorPayload,
  rev: number,
): void {
  doc.transact(() => {
    const { text, panel } = bindEditorSubdoc(doc, nodeId);
    panel.set('rev', rev);
    panel.set('language', payload.language);
    if (payload.locked != null) panel.set('locked', payload.locked);
    const current = text.toString();
    if (current !== payload.text) {
      text.delete(0, text.length);
      text.insert(0, payload.text);
    }
  });
}

export function writeNotesSubdoc(
  doc: Y.Doc,
  nodeId: string,
  payload: NotesPayload,
  rev: number,
): void {
  doc.transact(() => {
    const panel = panelMap(doc, nodeId, 'notes');
    panel.set('rev', rev);
    setPanelText(panel, payload.text);
  });
}

export function writeWhiteboardSubdoc(
  doc: Y.Doc,
  nodeId: string,
  payload: WhiteboardPayload,
  rev: number,
): void {
  seedSubdocPanel(doc, snapshotFromPayload(nodeId, 'whiteboard', rev, payload));
}

/** Subscribe to a single panel's Yjs state. */
export function observeSubdocPanel(
  doc: Y.Doc,
  nodeId: string,
  onChange: (snap: SubDocSnapshot | null) => void,
): () => void {
  const root = bindSubdocRoot(doc);
  const handler = () => onChange(readSubdocPanel(doc, nodeId));
  root.observeDeep(handler);
  const panel = root.get(nodeId);
  if (panel) panel.observeDeep(handler);
  handler();
  return () => {
    root.unobserveDeep(handler);
    const p = root.get(nodeId);
    if (p) p.unobserveDeep(handler);
  };
}
