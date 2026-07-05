import { useEffect, useId, useMemo, useState } from 'react';
import { catalog, type Item } from '@/content';
import { cn } from '@/lib/utils/cn';
import { buildShareUrl } from '@/store/navigation';
import { useWorkspace } from '@/store/workspace';
import { ChromeHint, chromeText } from '../chromeUi';
import { readCommandPaletteRecentIds, recordCommandPaletteRecentId } from './commandPaletteHistory';

export interface CommandPaletteCommand {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  run: () => void;
}

export interface CommandPaletteSection {
  id: string;
  label: string;
  commands: CommandPaletteCommand[];
}

export function filterCommands(commands: CommandPaletteCommand[], query: string): CommandPaletteCommand[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return commands;
  return commands
    .map((command, index) => ({ command, index, score: scoreCommand(command, terms) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((match) => match.command);
}

function scoreCommand(command: CommandPaletteCommand, terms: string[]): number {
  const label = command.label.toLowerCase();
  const hint = command.hint?.toLowerCase() ?? '';
  const id = command.id.toLowerCase();
  const keywords = command.keywords?.join(' ').toLowerCase() ?? '';
  const text = `${label} ${hint} ${id} ${keywords}`;
  const compactText = compactCommandText(text);
  const compactLabel = compactCommandText(label);
  const compactKeywords = compactCommandText(keywords);
  let score = 0;

  for (const term of terms) {
    const compactTerm = compactCommandText(term);
    const textMatch = text.includes(term);
    const compactMatch = compactTerm.length > 0 && compactText.includes(compactTerm);
    if (!textMatch && !compactMatch) return 0;
    if (label.startsWith(term)) score += 8;
    else if (label.includes(term)) score += 4;
    else if (compactTerm && compactLabel.startsWith(compactTerm)) score += 6;
    else if (compactTerm && compactLabel.includes(compactTerm)) score += 2;
    if (hint === term) score += 3;
    else if (hint.includes(term)) score += 1;
    if (id.includes(term)) score += 1;
    if (keywords.includes(term) || (compactTerm && compactKeywords.includes(compactTerm))) score += 2;
  }

  return score;
}

function compactCommandText(value: string): string {
  return value.replace(/[^a-z0-9]/g, '');
}

export type CommandSelectionKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

export function resolveCommandSelection(current: number, count: number, key: CommandSelectionKey): number {
  if (count <= 0) return 0;
  const clamped = Math.min(Math.max(current, 0), count - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return (clamped + (key === 'ArrowDown' ? 1 : -1) + count) % count;
}

export function buildOpenProblemCommand(item: Item, openProblem: (id: string) => void): CommandPaletteCommand {
  return {
    id: `open:${item.id}`,
    label: `Open ${item.title}`,
    hint: item.difficulty ?? 'problem',
    keywords: compactKeywords([
      item.id,
      item.pluginId,
      item.summary,
      item.courseId,
      item.topicId,
      item.source?.label,
      ...item.tags,
    ]),
    run: () => openProblem(item.id),
  };
}

function compactKeywords(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)));
}

function parseCommandSelectionKey(key: string): CommandSelectionKey | null {
  return key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End' ? key : null;
}

export function buildCommandPaletteSections(
  commands: CommandPaletteCommand[],
  query: string,
  recentCommandIds: string[],
): CommandPaletteSection[] {
  const filtered = filterCommands(commands, query);
  if (filtered.length === 0) return [];
  if (query.trim()) return [{ id: 'results', label: 'Results', commands: filtered }];

  const byId = new Map(filtered.map((command) => [command.id, command] as const));
  const recentCommands = recentCommandIds.map((id) => byId.get(id)).filter((command): command is CommandPaletteCommand => !!command);
  const recentIds = new Set(recentCommands.map((command) => command.id));
  const sections: CommandPaletteSection[] = [];
  if (recentCommands.length > 0) sections.push({ id: 'recent', label: 'Recent', commands: recentCommands });
  const allCommands = filtered.filter((command) => !recentIds.has(command.id));
  if (allCommands.length > 0) sections.push({ id: 'all', label: 'All commands', commands: allCommands });
  return sections;
}

export function CommandPalette({ inputId, onClose }: { inputId: string; onClose: () => void }) {
  const {
    activeItemId,
    canvasAdd,
    dir,
    enterCanvas,
    mode,
    openProblem,
    palette,
    problemFocused,
    setMode,
    setPalette,
    setPresent,
    setSettingsOpen,
    setTheme,
    theme,
    themePreset,
  } = useWorkspace();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState(() => readCommandPaletteRecentIds());
  const listboxId = useId();
  const titleId = useId();

  const commands = useMemo<CommandPaletteCommand[]>(() => {
    const problemCmds = catalog.items.filter((it) => it.pluginId).map((it) => buildOpenProblemCommand(it, openProblem));
    const actions: CommandPaletteCommand[] = [
      {
        id: 'mode:play',
        label: 'Mode: Play',
        hint: 'action',
        keywords: ['practice', 'run animation'],
        run: () => setMode('play'),
      },
      {
        id: 'mode:learn',
        label: 'Mode: Learn',
        hint: 'action',
        keywords: ['study', 'explanation'],
        run: () => setMode('learn'),
      },
      {
        id: 'mode:visualize',
        label: 'Mode: Canvas',
        hint: 'action',
        keywords: ['visualize', 'diagram', 'panels'],
        run: () => enterCanvas(),
      },
      {
        id: 'present',
        label: 'Enter presentation mode',
        hint: 'action',
        keywords: ['fullscreen'],
        run: () => setPresent(true),
      },
      {
        id: 'settings',
        label: 'Open settings',
        hint: 'action',
        keywords: ['preferences', 'options'],
        run: () => setSettingsOpen(true),
      },
      {
        id: 'theme',
        label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
        hint: 'action',
        keywords: ['appearance'],
        run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'palette',
        label: `${palette === 'cb' ? 'Disable' : 'Enable'} colour-blind palette`,
        hint: 'action',
        keywords: ['color blind', 'colorblind', 'accessibility'],
        run: () => setPalette(palette === 'cb' ? 'default' : 'cb'),
      },
      {
        id: 'share',
        label: 'Copy share link',
        hint: 'action',
        keywords: ['copy url', 'permalink'],
        run: () => {
          const canvasFocus = mode === 'visualize' && !problemFocused;
          const url = buildShareUrl(
            canvasFocus
              ? { mode, focus: 'canvas', theme, palette, themePreset, dir }
              : {
                  item: activeItemId,
                  input: inputId || undefined,
                  mode,
                  focus: 'problem',
                  theme,
                  palette,
                  themePreset,
                  dir,
                },
          );
          navigator.clipboard?.writeText(url).catch(() => {});
        },
      },
    ];
    const panelCmds: CommandPaletteCommand[] = (canvasAdd?.addableKinds ?? []).map((k) => ({
      id: `panel:${k.id}`,
      label: `Add panel: ${k.title}`,
      hint: 'panel',
      keywords: [k.id],
      run: () => canvasAdd?.onAddKind(k.id),
    }));
    const effectCmds: CommandPaletteCommand[] = (canvasAdd?.addableEffects ?? []).map((e) => ({
      id: `effect:${e.id}`,
      label: `Add effect: ${e.title}`,
      hint: 'effect',
      keywords: [e.id],
      run: () => canvasAdd?.onAddEffect?.(e.id),
    }));
    return [...actions, ...panelCmds, ...effectCmds, ...problemCmds];
  }, [
    activeItemId,
    canvasAdd,
    dir,
    enterCanvas,
    inputId,
    mode,
    openProblem,
    palette,
    problemFocused,
    setMode,
    setPalette,
    setPresent,
    setSettingsOpen,
    setTheme,
    theme,
    themePreset,
  ]);

  const sections = useMemo(() => buildCommandPaletteSections(commands, q, recentCommandIds), [commands, q, recentCommandIds]);
  const visibleCommands = useMemo(() => sections.flatMap((section) => section.commands), [sections]);
  const commandIndexById = useMemo(
    () => new Map(visibleCommands.map((command, index) => [command.id, index] as const)),
    [visibleCommands],
  );
  const clampedSel = visibleCommands.length ? Math.min(sel, visibleCommands.length - 1) : 0;
  const activeCommand = visibleCommands[clampedSel];
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const activeOptionId = activeCommand ? optionId(clampedSel) : undefined;
  const exec = (command?: CommandPaletteCommand) => {
    if (!command) return;
    setRecentCommandIds(recordCommandPaletteRecentId(command.id));
    command.run();
    onClose();
  };

  useEffect(() => {
    if (!activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeOptionId]);

  return (
    <div
      className="absolute inset-0 z-50 grid place-items-start justify-items-center bg-black/40 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
    >
      <div
        className="w-[400px] max-w-[92vw] overflow-hidden rounded-[var(--radius)] border border-edge bg-panel shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="sr-only">
          Command palette
        </h2>
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            const selectionKey = parseCommandSelectionKey(e.key);
            if (selectionKey) {
              e.preventDefault();
              setSel((s) => resolveCommandSelection(s, visibleCommands.length, selectionKey));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              exec(activeCommand);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Search problems, panels, effects..."
          className={cn('w-full border-b border-edge bg-transparent px-3 py-2 text-ink outline-none placeholder:text-ink3', chromeText.base)}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded="true"
          aria-activedescendant={activeOptionId}
          aria-label="Search commands"
        />
        <div className="sr-only" aria-live="polite">
          {visibleCommands.length === 0
            ? 'No matching commands'
            : `${visibleCommands.length} command${visibleCommands.length === 1 ? '' : 's'} available`}
        </div>
        <div id={listboxId} className="ws-scroll max-h-[50vh] overflow-auto py-0.5" role="listbox" aria-label="Commands">
          {visibleCommands.length === 0 ? (
            <div className={cn('px-3 py-2 text-ink3', chromeText.base)}>No matches.</div>
          ) : (
            sections.map((section) => (
              <div key={section.id}>
                <div className={cn('px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink3', chromeText.base)}>
                  {section.label}
                </div>
                {section.commands.map((command) => {
                  const index = commandIndexById.get(command.id);
                  if (index == null) return null;
                  return (
                    <button
                      id={optionId(index)}
                      key={command.id}
                      type="button"
                      role="option"
                      aria-selected={index === clampedSel}
                      onMouseEnter={() => setSel(index)}
                      onClick={() => exec(command)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left',
                        index === clampedSel ? 'bg-accentbg text-accent' : 'text-ink2 hover:bg-panel2',
                      )}
                    >
                      <span className="truncate">{command.label}</span>
                      {command.hint && <ChromeHint className="shrink-0">{command.hint}</ChromeHint>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
