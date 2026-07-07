import { cn } from '@/lib/utils/cn';
import { nodeText } from '@/design/typography';

export interface SelectCategory<T extends string = string> {
  readonly label: string;
  readonly items: readonly { readonly id: T; readonly label: string; readonly hint?: string }[];
}

/** Reusable grouped select (Strudel category-select-items pattern). */
export function CategorySelectItems<T extends string>({
  categories,
  value,
  onChange,
  placeholder = 'Choose…',
}: {
  readonly categories: readonly SelectCategory<T>[];
  readonly value: T | '';
  readonly onChange: (id: T) => void;
  readonly placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value as T);
      }}
      className={cn(
        'category-select nodrag w-full rounded border border-edge bg-panel2 px-2 py-1.5 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
        nodeText.sm,
      )}
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
  readonly categories: readonly SelectCategory[];
  readonly onPick: (id: string) => void;
}) {
  return (
    <div className="category-select-list flex flex-col gap-2">
      {categories.map((cat) => (
        <div key={cat.label} className="category-select-list__group">
          <div
            className={cn(
              'category-select-list__label mb-0.5 px-1 font-medium text-ink3',
              nodeText.xs,
            )}
          >
            {cat.label}
          </div>
          <div className="category-select-list__items flex flex-col gap-0.5">
            {cat.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item.id)}
                className={cn(
                  'category-select-list__item rounded border border-transparent px-2 py-1 text-left text-ink2 outline-none hover:border-edge hover:bg-panel2 focus-visible:border-accent focus-visible:bg-panel2',
                  nodeText.sm,
                )}
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
