import { useEffect, useState } from 'react';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

import { useCanvasStatic, Hint, TextArea } from '@/shell/canvas';
/** #118 Notes: freeform markdown-ish notes pinned per problem (localStorage). */
export function NotesPanelBody() {
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
    <section className="nodrag notes-panel">
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
