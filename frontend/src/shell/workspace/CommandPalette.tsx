import { useId, useMemo, useState } from 'react';
import { catalog } from '@/content';
import { cn } from '@/lib/utils/cn';
import { buildShareUrl } from '@/store/navigation';
import { useWorkspace } from '@/store/workspace';
import { ChromeHint, chromeText } from '../chromeUi';

export interface CommandPaletteCommand {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export function filterCommands(commands: CommandPaletteCommand[], query: string): CommandPaletteCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((command) => `${command.label} ${command.hint ?? ''}`.toLowerCase().includes(q));
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
  const listboxId = useId();

  const commands = useMemo<CommandPaletteCommand[]>(() => {
    const open = (id: string): CommandPaletteCommand => {
      const it = catalog.getItem(id);
      return {
        id: `open:${id}`,
        label: `Open ${it?.title ?? id}`,
        hint: it?.difficulty ?? 'problem',
        run: () => openProblem(id),
      };
    };
    const problemCmds = catalog.items.filter((it) => it.pluginId).map((it) => open(it.id));
    const actions: CommandPaletteCommand[] = [
      { id: 'mode:play', label: 'Mode: Play', hint: 'action', run: () => setMode('play') },
      { id: 'mode:learn', label: 'Mode: Learn', hint: 'action', run: () => setMode('learn') },
      { id: 'mode:visualize', label: 'Mode: Canvas', hint: 'action', run: () => enterCanvas() },
      { id: 'present', label: 'Enter presentation mode', hint: 'action', run: () => setPresent(true) },
      { id: 'settings', label: 'Open settings', hint: 'action', run: () => setSettingsOpen(true) },
      {
        id: 'theme',
        label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
        hint: 'action',
        run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'palette',
        label: `${palette === 'cb' ? 'Disable' : 'Enable'} colour-blind palette`,
        hint: 'action',
        run: () => setPalette(palette === 'cb' ? 'default' : 'cb'),
      },
      {
        id: 'share',
        label: 'Copy share link',
        hint: 'action',
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
      run: () => canvasAdd?.onAddKind(k.id),
    }));
    const effectCmds: CommandPaletteCommand[] = (canvasAdd?.addableEffects ?? []).map((e) => ({
      id: `effect:${e.id}`,
      label: `Add effect: ${e.title}`,
      hint: 'effect',
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

  const filtered = useMemo(() => filterCommands(commands, q), [commands, q]);
  const clampedSel = filtered.length ? Math.min(sel, filtered.length - 1) : 0;
  const activeCommand = filtered[clampedSel];
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const exec = (command?: CommandPaletteCommand) => {
    if (!command) return;
    command.run();
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 grid place-items-start justify-items-center bg-black/40 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="command palette"
      aria-modal="true"
    >
      <div
        className="w-[400px] max-w-[92vw] overflow-hidden rounded-[var(--radius)] border border-edge bg-panel shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => (filtered.length ? Math.min(s + 1, filtered.length - 1) : 0));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
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
          aria-activedescendant={activeCommand ? optionId(clampedSel) : undefined}
          aria-label="Search commands"
        />
        <div id={listboxId} className="ws-scroll max-h-[50vh] overflow-auto py-0.5" role="listbox">
          {filtered.length === 0 ? (
            <div className={cn('px-3 py-2 text-ink3', chromeText.base)}>No matches.</div>
          ) : (
            filtered.map((command, index) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
