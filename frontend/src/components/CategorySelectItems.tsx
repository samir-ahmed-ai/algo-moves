import { cn } from '../lib/cn';
import { nodeText } from '../shell/canvas/nodeui';

export interface SelectCategory<T extends string = string> {
  label: string;
  items: { id: T; label: string; hint?: string }[];
}

/** Reusable grouped select (Strudel category-select-items pattern). */
export function CategorySelectItems<T extends string>({
  categories,
  value,
  onChange,
  placeholder = 'Choose…',
}: {
  categories: SelectCategory<T>[];
  value: T | '';
  onChange: (id: T) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn('nodrag w-full rounded border border-edge bg-panel2 px-2 py-1.5 text-ink outline-none focus:border-accent', nodeText.sm)}
    >
      <option value="">{placeholder}</option>
      {categories.map((cat) => (
        <optgroup key={cat.label} label={cat.label}>
          {cat.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
              {item.hint ? ` — ${item.hint}` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Render-only grouped list for menus. */
export function CategorySelectList({
  categories,
  onPick,
}: {
  categories: SelectCategory[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {categories.map((cat) => (
        <div key={cat.label}>
          <div className={cn('mb-0.5 px-1 font-medium text-ink3', nodeText.xs)}>{cat.label}</div>
          <div className="flex flex-col gap-0.5">
            {cat.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item.id)}
                className={cn('rounded border border-transparent px-2 py-1 text-left text-ink2 hover:border-edge hover:bg-panel2', nodeText.sm)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
