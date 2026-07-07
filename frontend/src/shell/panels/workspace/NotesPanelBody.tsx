import { useEffect, useState } from 'react';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type { NotesPayload } from '@/lib/session/subdocProtocol';

import {
  useCanvasStatic,
  useCanvasCollabOptional,
  useSubDocSyncContext,
  Hint,
  TextArea,
} from '@/shell/canvas';

/**
 * #118 Notes: freeform markdown-ish notes. Solo they pin per problem in
 * localStorage; inside a live session they ride the shared 'notes' sub-doc so
 * every peer sees the same text in realtime.
 */
export function NotesPanelBody() {
  const collab = useCanvasCollabOptional();
  if (collab?.isCollaborating) return <SharedNotesBody />;
  return <LocalNotesBody />;
}

function SharedNotesBody() {
  const { item } = useCanvasStatic();
  const sync = useSubDocSyncContext();
  const text = (sync.payload as NotesPayload).text ?? '';
  return (
    <section className="workspace-panel workspace-panel--notes nodrag notes-panel">
      <div className="notes-panel__head">
        <div>
          <span className="notes-panel__eyebrow">shared notes</span>
          <h3>{item.title}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {sync.isLive && <span className={cn('font-medium text-good', chromeText.xs)}>Live</span>}
          <span className="notes-panel__count">{text.length} chars</span>
        </div>
      </div>
      <div className="notes-panel__editor">
        <TextArea
          value={text}
          readOnly={sync.readOnly}
          onChange={(e) => sync.setPayload({ text: e.target.value })}
          placeholder="Notes everyone in the session can see…"
          className="min-h-0 flex-1"
        />
      </div>
      <div className="notes-panel__footer">
        <Hint>
          {sync.readOnly ? 'View-only while the board is locked' : 'Shared with the session'}
        </Hint>
      </div>
    </section>
  );
}

function LocalNotesBody() {
  const { item } = useCanvasStatic();
  const k = STORAGE_KEYS.NOTES(item.id);
  const [text, setText] = useState(() => readStorageText(k, '') ?? '');
  useEffect(() => {
    setText(readStorageText(k, '') ?? '');
  }, [k]);
  const onChange = (v: string) => {
    setText(v);
    writeStorageText(k, v);
  };
  return (
    <section className="workspace-panel workspace-panel--notes nodrag notes-panel">
      <div className="notes-panel__head">
        <div>
          <span className="notes-panel__eyebrow">autosaved notes</span>
          <h3>{item.title}</h3>
        </div>
        <span className="notes-panel__count">{text.length} chars</span>
      </div>
      <div className="notes-panel__editor">
        <TextArea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Jot the invariant, an edge case, a reminder…"
          className="min-h-0 flex-1"
        />
      </div>
      <div className="notes-panel__footer">
        <Hint>Markdown-ish · saved automatically</Hint>
      </div>
    </section>
  );
}
