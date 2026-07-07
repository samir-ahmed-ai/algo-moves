import { Code2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { nodeIconGlyph, nodeText, PanelHeaderAction, RADIUS_CTRL } from '@/shell/canvas';

export interface CodeVariant {
  text: string;
  lang?: string | undefined;
  file?: string | undefined;
}

function isCodeVariant(value: CodeVariant | undefined): value is CodeVariant {
  return value !== undefined;
}

function languageLabel(lang?: string): string {
  return (lang?.trim() || 'text').toUpperCase();
}

/** All language variants of a plugin's solution: the primary `code` plus `extraCode` (#71). */
export function codeVariants(plugin: {
  code?: CodeVariant;
  extraCode?: CodeVariant[];
}): CodeVariant[] {
  return [plugin.code, ...(plugin.extraCode ?? [])].filter(isCodeVariant);
}

export function LangTabs({
  variants,
  active,
  onPick,
}: {
  variants: readonly Pick<CodeVariant, 'lang'>[];
  active: number;
  onPick: (i: number) => void;
}) {
  if (variants.length < 2) return null;
  return (
    <div className="language-tabs flex flex-wrap gap-1">
      {variants.map((v, i) => (
        <button
          key={`${v.lang ?? 'text'}-${i}`}
          type="button"
          onClick={() => onPick(i)}
          className={cn(
            `language-tab nodrag px-2 py-0.5 font-medium transition-colors ${RADIUS_CTRL}`,
            nodeText.sm,
            i === active
              ? 'language-tab--active bg-accentbg text-accent'
              : 'language-tab--idle text-ink3 hover:bg-panel2 hover:text-ink',
          )}
          aria-pressed={i === active}
        >
          {languageLabel(v.lang)}
        </button>
      ))}
    </div>
  );
}

/** Icon-based language tabs for Code Studio panel headers. */
export function HeaderLangTabs({
  variants,
  active,
  onPick,
}: {
  variants: readonly Pick<CodeVariant, 'lang' | 'file'>[];
  active: number;
  onPick: (i: number) => void;
}) {
  if (variants.length < 2) return null;
  return (
    <>
      {variants.map((v, i) => (
        <PanelHeaderAction
          key={`${v.lang ?? 'text'}-${v.file ?? i}`}
          variant="toggle"
          active={i === active}
          onClick={() => onPick(i)}
          title={`${languageLabel(v.lang)}${v.file ? ` · ${v.file}` : ''}`}
        >
          <Code2 className={nodeIconGlyph} />
        </PanelHeaderAction>
      ))}
    </>
  );
}
