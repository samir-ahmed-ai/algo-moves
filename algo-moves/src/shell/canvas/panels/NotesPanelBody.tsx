import { useEffect, useState } from 'react';
import { useCanvasStatic } from '../CanvasContext';
import { readStorageText, writeStorageText } from '../../../lib/storage';
import { Hint, Label, Pill, TextArea } from '../nodeui';

/** #118 Notes: freeform markdown-ish notes pinned per problem (localStorage). */
export function NotesPanelBody() {
  const { item } = useCanvasStatic();
  const k = `algo-moves:notes:${item.id}`;
  const [text, setText] = useState(() => readStorageText(k, '') ?? '');
  useEffect(() => {
    setText(readStorageText(k, '') ?? '');
  }, [k]);
  const onChange = (v: string) => {
    setText(v);
    writeStorageText(k, v);
  };
  return (
    <div className="nodrag flex h-full flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>Notes</Label>
        <Pill>{text.length} chars</Pill>
      </div>
      <TextArea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Jot the invariant, an edge case, a reminder…"
        className="min-h-0 flex-1"
      />
      <Hint>Markdown-ish · saved automatically</Hint>
    </div>
  );
}
