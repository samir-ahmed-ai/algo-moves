import type { ReactNode } from 'react';
import type { BundledLanguage, Highlighter } from 'shiki';
import { ENTRY_SIG, funcLineTone, type FuncLineTone } from './snippetMeta';

type ShikiToken = {
  content: string;
  color?: string;
  fontStyle?: number;
  offset: number;
  type?: number;
  explanation?: Array<{ scopes: Array<{ scopeName: string }> }>;
};

const LANG_IMPORTS: Partial<Record<BundledLanguage, () => Promise<{ default: unknown }>>> = {
  go: () => import('@shikijs/langs/go'),
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  python: () => import('@shikijs/langs/python'),
  java: () => import('@shikijs/langs/java'),
  rust: () => import('@shikijs/langs/rust'),
};

const LANG_MAP: Record<string, BundledLanguage> = {
  go: 'go',
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  py: 'python',
  python: 'python',
  java: 'java',
  rust: 'rust',
};

/** Map TextMate scopes to existing puzzle-tray CSS classes. */
function scopeToClass(scope: string): string | undefined {
  if (scope.includes('comment')) return 'hl-comment';
  if (scope.includes('string')) return 'hl-string';
  if (scope.includes('keyword') || scope.includes('storage.type') || scope.includes('storage.modifier')) {
    return 'hl-keyword';
  }
  if (scope.includes('constant.language') || scope.includes('constant.numeric')) return 'hl-number';
  if (scope.includes('entity.name.function')) return 'hl-name';
  if (scope.includes('punctuation') || scope.includes('meta.brace')) return 'hl-punct';
  return undefined;
}

function tokenToClass(token: ShikiToken): string | undefined {
  if (token.type === 1 || token.content.trimStart().startsWith('//')) return 'hl-comment';
  if (token.type === 2) return 'hl-string';
  const scopes = token.explanation?.flatMap((e) => e.scopes.map((s) => s.scopeName)) ?? [];
  for (const scope of scopes) {
    const cls = scopeToClass(scope);
    if (cls) return cls;
  }
  return undefined;
}

function tokensToSpans(tokens: ShikiToken[]): ReactNode {
  return tokens.map((token, i) => {
    const cls = tokenToClass(token);
    return (
      <span key={i} className={cls}>
        {token.content}
      </span>
    );
  });
}

let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLangs = new Set<BundledLanguage>();

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    const { createHighlighter } = await import('shiki/bundle/web');
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: [],
    });
  }
  return highlighterPromise;
}

async function ensureLang(lang: BundledLanguage): Promise<Highlighter> {
  const highlighter = await getHighlighter();
  if (!loadedLangs.has(lang)) {
    const loader = LANG_IMPORTS[lang];
    if (!loader) throw new Error(`Unsupported Shiki language: ${lang}`);
    const mod = await loader();
    await highlighter.loadLanguage(mod.default as never);
    loadedLangs.add(lang);
  }
  return highlighter;
}

function normalizeLang(lang: string): BundledLanguage | null {
  return LANG_MAP[lang.toLowerCase()] ?? null;
}

function plainLine(line: string): ReactNode {
  return <span>{line}</span>;
}

/** Domain-specific signature styling layered on top of Shiki token spans. */
function renderSignatureLine(
  line: string,
  tone: FuncLineTone,
  bodySpans: ReactNode,
): ReactNode {
  const trimmed = line.trimStart();
  const lead = line.slice(0, line.length - trimmed.length);
  const nameClass = tone === 'hl-line-entry' ? 'hl-sig-name' : 'hl-sig-name-func';

  if (tone === 'hl-line-entry') {
    const m = trimmed.match(ENTRY_SIG);
    if (m) {
      const funcName = m[1] ?? m[2] ?? m[3];
      const kw = m[1] ? 'func' : m[2] ? 'function' : 'def';
      const rest = m[4] ?? '';
      return (
        <>
          {lead}
          <span className="hl-sig-kw">{kw}</span>{' '}
          <span className={nameClass}>{funcName}</span>
          {rest ? <span>{rest}</span> : null}
        </>
      );
    }
  }

  return bodySpans;
}

/** Lazy-loaded Shiki syntax coloring for reassemble puzzle snippets. */
export async function highlightSnippetShiki(
  code: string,
  lang = 'go',
  opts?: { gutter?: boolean },
): Promise<ReactNode> {
  const shikiLang = normalizeLang(lang);
  const lines = code.split('\n');

  if (!shikiLang) {
    return lines.map((line, li) => (
      <div key={li} className="piece-code-line">
        {opts?.gutter && (
          <span className="piece-code-gutter" aria-hidden>
            {li + 1}
          </span>
        )}
        <span className="piece-code-text">{plainLine(line)}</span>
      </div>
    ));
  }

  const highlighter = await ensureLang(shikiLang);
  const theme = 'github-dark';

  return lines.map((line, li) => {
    const tone = funcLineTone(line.trim(), lang);
    const lineClass = `piece-code-line${tone ? ` ${tone}` : ''}`;

    let body: ReactNode;
    if (line.length === 0) {
      body = plainLine('');
    } else {
      const result = highlighter.codeToTokens(line, {
        lang: shikiLang,
        theme,
        includeExplanation: 'scopeName',
      });
      const spans = tokensToSpans((result.tokens[0] ?? []) as ShikiToken[]);
      body = tone ? renderSignatureLine(line, tone, spans) : spans;
    }

    return (
      <div key={li} className={lineClass}>
        {opts?.gutter && (
          <span className="piece-code-gutter" aria-hidden>
            {li + 1}
          </span>
        )}
        <span className="piece-code-text">{body}</span>
      </div>
    );
  });
}

/** Synchronous fallback while Shiki chunk loads (plain text, preserves layout). */
export function highlightSnippetPlain(
  code: string,
  lang = 'go',
  opts?: { gutter?: boolean },
): ReactNode {
  const lines = code.split('\n');
  return lines.map((line, li) => {
    const tone = funcLineTone(line.trim(), lang);
    const body = tone ? renderSignatureLine(line, tone, plainLine(line)) : plainLine(line);
    return (
      <div key={li} className={`piece-code-line${tone ? ` ${tone}` : ''}`}>
        {opts?.gutter && (
          <span className="piece-code-gutter" aria-hidden>
            {li + 1}
          </span>
        )}
        <span className="piece-code-text">{body}</span>
      </div>
    );
  });
}
