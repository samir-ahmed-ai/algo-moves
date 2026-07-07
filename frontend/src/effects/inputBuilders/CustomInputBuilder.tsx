import { useState } from 'react';
import { Btn, Field, TextArea } from '@/components/shared/formControls';

const EXAMPLES = [
  { label: 'Sorted array', json: '{"values":[1,3,5,7,9,11]}' },
  { label: 'Graph edges', json: '{"n":4,"edges":[[0,1],[1,2],[2,3]]}' },
  { label: 'DP grid', json: '{"grid":[[1,2],[3,4]]}' },
];

export function CustomInputBuilder({ onApply }: { onApply: (value: unknown) => void }) {
  const [text, setText] = useState(EXAMPLES[0].json);
  const [err, setErr] = useState('');

  const apply = () => {
    try {
      onApply(JSON.parse(text));
      setErr('');
    } catch {
      setErr('Invalid JSON');
    }
  };

  return (
    <div className="nodrag flex flex-col gap-2">
      <Field label="Examples">
        <div className="flex flex-wrap gap-1">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => setText(ex.json)}
              className="rounded border border-edge px-1.5 py-0.5 text-ink2 hover:bg-panel2"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </Field>
      <TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="font-mono"
      />
      {err && <span className="text-bad text-xs">{err}</span>}
      <Btn variant="good" size="sm" onClick={apply}>
        Apply JSON
      </Btn>
    </div>
  );
}
