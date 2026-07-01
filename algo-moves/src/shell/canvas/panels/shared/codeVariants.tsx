import { cn } from '../../../../lib/cn';
import { nodeText, RADIUS_CTRL } from '../../nodeui';

/** All language variants of a plugin's solution: the primary `code` plus `extraCode` (#71). */
export function codeVariants(plugin: {
  code?: { text: string; lang?: string; file?: string };
  extraCode?: { text: string; lang?: string; file?: string }[];
}) {
  return [plugin.code, ...(plugin.extraCode ?? [])].filter(Boolean) as {
    text: string;
    lang?: string;
    file?: string;
  }[];
}

export function LangTabs({
  variants,
  active,
  onPick,
}: {
  variants: { lang?: string }[];
  active: number;
  onPick: (i: number) => void;
}) {
  if (variants.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {variants.map((v, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          className={cn(
            `nodrag px-2 py-0.5 font-medium transition-colors ${RADIUS_CTRL}`,
            nodeText.sm,
            i === active ? 'bg-accentbg text-accent' : 'text-ink3 hover:bg-panel2 hover:text-ink',
          )}
        >
          {(v.lang ?? 'text').toUpperCase()}
        </button>
      ))}
    </div>
  );
}
