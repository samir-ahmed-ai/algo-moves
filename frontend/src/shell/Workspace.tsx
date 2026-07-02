import { useEffect, useMemo, useRef, useState } from 'react';
import { FileQuestion } from 'lucide-react';
import { getPlugin, usePlayer } from '../core';
import { catalog } from '../content';
import { useWorkspace, normalizeThemePreset } from '@/store/workspace';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { cn } from '@/lib/utils/cn';
import { buildShareUrl, readShareFromUrl, writeShareToUrl } from '@/store/navigation';
import { loadProjectFromUrl } from '@/store/project-state';
import { UnifiedLeftSidebar } from './UnifiedLeftSidebar';
import { CanvasStage } from './canvas/CanvasStage';
import { LearnStudio } from './canvas/LearnStudio';
import { SettingsDialog } from './canvas/SettingsDialog';
import { MobileTransportSheet } from './canvas/MobileTransportSheet';
import { MobileSwipeReturn } from './mobile/MobileSwipeReturn';
import { CategoryBoard, TrackCategoryBoard } from './CategoryBoard';
import { TagChip } from './ui';
import { ChromeHint, chromeText } from './chromeUi';

export function Workspace() {
  const {
    density,
    present,
    setPresent,
    tweaks,
    activeItemId,
    openProblem,
    activeTrackId,
    activeCategoryId,
    mode,
    setMode,
    theme,
    setTheme,
    palette,
    setPalette,
    themePreset,
    setThemePreset,
    dir,
    setDir,
    canvasProject,
    mobileTransportOpen,
    setMobileTransportOpen,
  } = useWorkspace();
  const narrate = tweaks.narrate;
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const item = catalog.getItem(activeItemId) ?? catalog.items[0];
  const plugin = item?.pluginId ? getPlugin(item.pluginId) : undefined;

  const [inputId, setInputId] = useState(() => {
    if (!plugin) return '';
    const shared = readShareFromUrl();
    const fromUrl =
      shared?.item === activeItemId && shared.input && plugin.inputs.some((i) => i.id === shared.input)
        ? shared.input
        : null;
    return fromUrl ?? plugin.inputs[0]?.id ?? '';
  });
  const [customInput, setCustomInput] = useState<unknown>(null);
  const shareHydratedRef = useRef(false);
  const canvasAppliedRef = useRef(false);
  const pendingProjectHydration = useRef(
    typeof location !== 'undefined' && !!loadProjectFromUrl()?.share,
  );

  // Restore the sample input from the URL when the problem changes; default to first input.
  useEffect(() => {
    if (!plugin) return;
    const shared = readShareFromUrl();
    const fromUrl =
      shared?.item === activeItemId && shared.input && plugin.inputs.some((i) => i.id === shared.input)
        ? shared.input
        : null;
    setInputId(fromUrl ?? plugin.inputs[0]?.id ?? '');
    setCustomInput(null);
  }, [plugin?.meta.id, activeItemId]);

  // Hydrate full project from ?state= URL (lz-string) when present — once per page load.
  useEffect(() => {
    const project = loadProjectFromUrl();
    if (!project?.share) return;

    if (!shareHydratedRef.current) {
      shareHydratedRef.current = true;
      const s = project.share;
      if (s.item && catalog.getItem(s.item)) {
        openProblem(s.item);
      }
      if (s.mode === 'visualize') setMode('visualize');
      else if (s.mode === 'learn' || s.mode === 'practice' || s.mode === 'code') setMode('learn');
      if (s.theme) setTheme(s.theme === 'light' ? 'light' : 'dark');
      if (s.palette) setPalette(s.palette === 'cb' ? 'cb' : 'default');
      if (s.themePreset) setThemePreset(normalizeThemePreset(s.themePreset));
      if (s.dir === 'TB' || s.dir === 'LR') setDir(s.dir);
      if (s.input) {
        const targetPlugin = s.item ? getPlugin(catalog.getItem(s.item)?.pluginId ?? '') : plugin;
        const validInput =
          targetPlugin && targetPlugin.inputs.some((i) => i.id === s.input) ? s.input : null;
        if (validInput) setInputId(validInput);
      }
    }

    if (canvasAppliedRef.current || !canvasProject) return;
    canvasAppliedRef.current = true;
    const t = window.setTimeout(() => canvasProject.applyProjectState(project), 100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasProject]);

  // Persist problem, example, mode, and theme in the URL so refresh reopens the same view.
  useEffect(() => {
    if (!activeItemId) return;
    if (pendingProjectHydration.current && !shareHydratedRef.current) return;
    writeShareToUrl({
      item: activeItemId,
      input: inputId || undefined,
      mode,
      theme,
      palette,
      themePreset,
      dir,
    });
  }, [activeItemId, inputId, mode, theme, palette, themePreset, dir]);

  // Picking a different sample clears any custom edits.
  const selectInput = (id: string) => {
    setInputId(id);
    setCustomInput(null);
  };

  const input = plugin?.inputs.find((i) => i.id === inputId) ?? plugin?.inputs[0];
  const effectiveValue = customInput ?? input?.value;
  const baseFrames = useMemo(
    () => (plugin && effectiveValue != null ? plugin.record(effectiveValue) : []),
    [plugin, effectiveValue],
  );
  const player = usePlayer(Math.max(baseFrames.length, 1));
  const frame = baseFrames[player.index] ?? baseFrames[0];
  const ready = !!plugin && !!frame;

  const showTrackBoard = activeTrackId && !activeCategoryId;
  const showCategoryBoard = !!activeCategoryId;

  // Keyboard transport: ← / → step, space play/pause, Home/End jump.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K opens the command palette from anywhere (even inside inputs).
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        return;
      }
      const t = e.target;
      if (isEditableTarget(t)) return;
      // The Learn Studio owns its own navigation keys and its trace views carry
      // on-screen transport, so the global transport shortcuts would only drive
      // hidden canvas playback there — skip them in learn mode.
      const transport = mode !== 'learn';
      switch (e.key) {
        case 'ArrowRight':
          if (!transport) break;
          e.preventDefault();
          player.next();
          break;
        case 'ArrowLeft':
          if (!transport) break;
          e.preventDefault();
          player.prev();
          break;
        case ' ':
          if (!transport) break;
          e.preventDefault();
          player.togglePlay();
          break;
        case 'Home':
          if (!transport) break;
          e.preventDefault();
          player.goTo(0);
          break;
        case 'End':
          if (!transport) break;
          e.preventDefault();
          player.goTo(player.total - 1);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          setPresent(!present);
          break;
        case '?':
          e.preventDefault();
          setHelpOpen((h) => !h);
          break;
        case 'Escape':
          if (helpOpen) setHelpOpen(false);
          else if (present) setPresent(false);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player, present, setPresent, helpOpen, mode]);

  // Closing the palette / re-opening the catalog selection happens inside the component.

  // Text-to-speech narration: speak the current caption when it changes.
  const caption = frame?.move.caption;
  useEffect(() => {
    if (!narrate || !caption || typeof window === 'undefined' || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(caption);
    u.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [caption, narrate]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  // #121 sound cues: a short tone on each step, pitched by the move's tone.
  const audioRef = useRef<AudioContext | null>(null);
  const moveTone = frame?.move.tone;
  const moveType = frame?.move.type;
  useEffect(() => {
    if (!tweaks.sound || !moveType) return;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioRef.current ?? (audioRef.current = new Ctx());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = moveTone === 'good' ? 660 : moveTone === 'bad' ? 220 : 440;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.13);
    } catch {
      // Web Audio unavailable — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveType, moveTone, frame, tweaks.sound]);

  return (
    <div
      data-density={density}
      className={cn(
        'relative flex h-full w-full overflow-hidden bg-bg',
        !tweaks.animate && '[&_*]:!transition-none [&_*]:!animate-none',
      )}
    >
      {!present && <UnifiedLeftSidebar />}

      <div className="relative min-h-0 min-w-0 flex-1 h-full">
        {showTrackBoard ? (
          <TrackCategoryBoard trackId={activeTrackId!} />
        ) : showCategoryBoard ? (
          <CategoryBoard categoryId={activeCategoryId!} trackId={activeTrackId} />
        ) : ready ? (
          mode === 'learn' ? (
            <LearnStudio
              plugin={plugin!}
              item={item}
              inputId={inputId}
              setInputId={selectInput}
              customInput={customInput}
              setCustomInput={setCustomInput}
              frames={baseFrames}
              player={player}
              frame={frame!}
            />
          ) : (
            <CanvasStage
              plugin={plugin!}
              item={item}
              inputId={inputId}
              setInputId={selectInput}
              customInput={customInput}
              setCustomInput={setCustomInput}
              baseFrames={baseFrames}
              player={player}
            />
          )
        ) : (
          <NoPreview title={item.title} tags={item.tags} />
        )}
      </div>

      {present && (
        <div className={cn('pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-edge bg-panel/90 px-2 py-0.5 text-ink3 shadow backdrop-blur', chromeText.sm)}>
          Presentation mode · press <span className="font-mono text-ink2">Esc</span> or <span className="font-mono text-ink2">F</span> to exit
        </div>
      )}

      {helpOpen && <ShortcutsOverlay onClose={() => setHelpOpen(false)} />}
      {paletteOpen && <CommandPalette inputId={inputId} onClose={() => setPaletteOpen(false)} />}
      <MobileTransportSheet open={mobileTransportOpen} onClose={() => setMobileTransportOpen(false)} />
      <MobileSwipeReturn />
      <SettingsDialog />
    </div>
  );
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['←', '→'], label: 'Step back / forward' },
  { keys: ['Space'], label: 'Play / pause' },
  { keys: ['Home', 'End'], label: 'Jump to first / last frame' },
  { keys: ['C'], label: 'Focus canvas (collapse chrome)' },
  { keys: ['F'], label: 'Presentation mode' },
  { keys: ['?'], label: 'Toggle this help' },
  { keys: ['⌘', 'K'], label: 'Command palette' },
  { keys: ['Shift', 'drag'], label: 'Box-select panels' },
  { keys: ['Delete'], label: 'Remove selected panels' },
  { keys: ['Esc'], label: 'Close overlay / exit presentation' },
];

interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

function CommandPalette({ inputId, onClose }: { inputId: string; onClose: () => void }) {
  const ws = useWorkspace();
  const { openProblem, setMode, setPresent, theme, setTheme, palette, setPalette, setSettingsOpen, canvasAdd } = ws;
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const open = (id: string): Command => {
      const it = catalog.getItem(id);
      return {
        id: `open:${id}`,
        label: `Open ${it?.title ?? id}`,
        hint: it?.difficulty ?? 'problem',
        run: () => openProblem(id),
      };
    };
    const problemCmds = catalog.items.filter((it) => it.pluginId).map((it) => open(it.id));
    const actions: Command[] = [
      { id: 'mode:visualize', label: 'Mode: Visualize', hint: 'action', run: () => setMode('visualize') },
      { id: 'mode:learn', label: 'Mode: Learn', hint: 'action', run: () => setMode('learn') },
      { id: 'present', label: 'Enter presentation mode', hint: 'action', run: () => setPresent(true) },
      { id: 'settings', label: 'Open settings', hint: 'action', run: () => setSettingsOpen(true) },
      { id: 'theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, hint: 'action', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      { id: 'palette', label: `${palette === 'cb' ? 'Disable' : 'Enable'} colour-blind palette`, hint: 'action', run: () => setPalette(palette === 'cb' ? 'default' : 'cb') },
      {
        id: 'share',
        label: 'Copy share link',
        hint: 'action',
        run: () => {
          const url = buildShareUrl({
            item: ws.activeItemId,
            input: inputId || undefined,
            mode: ws.mode,
            theme: ws.theme,
            palette: ws.palette,
            themePreset: ws.themePreset,
            dir: ws.dir,
          });
          navigator.clipboard?.writeText(url).catch(() => {});
        },
      },
    ];
    const panelCmds: Command[] = (canvasAdd?.addableKinds ?? []).map((k) => ({
      id: `panel:${k.id}`,
      label: `Add panel: ${k.title}`,
      hint: 'panel',
      run: () => canvasAdd?.onAddKind(k.id),
    }));
    const effectCmds: Command[] = (canvasAdd?.addableEffects ?? []).map((e) => ({
      id: `effect:${e.id}`,
      label: `Add effect: ${e.title}`,
      hint: 'effect',
      run: () => canvasAdd?.onAddEffect?.(e.id),
    }));
    return [...actions, ...panelCmds, ...effectCmds, ...problemCmds];
  }, [ws, inputId, openProblem, setMode, setPresent, theme, setTheme, palette, setPalette, setSettingsOpen, canvasAdd]);

  const filtered = commands.filter((c) => !q || c.label.toLowerCase().includes(q.toLowerCase()));
  const clampedSel = Math.min(sel, Math.max(filtered.length - 1, 0));
  const exec = (c?: Command) => {
    if (!c) return;
    c.run();
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 grid place-items-start justify-items-center bg-black/40 pt-[12vh] backdrop-blur-sm" onClick={onClose} role="dialog" aria-label="command palette">
      <div className="w-[400px] max-w-[92vw] overflow-hidden rounded-[var(--radius)] border border-edge bg-panel shadow-[var(--shadow-xl)]" onClick={(e) => e.stopPropagation()}>
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
              setSel((s) => Math.min(s + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              exec(filtered[clampedSel]);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Search problems, panels, effects…"
          className={cn('w-full border-b border-edge bg-transparent px-3 py-2 text-ink outline-none placeholder:text-ink3', chromeText.base)}
        />
        <div className="ws-scroll max-h-[50vh] overflow-auto py-0.5">
          {filtered.length === 0 ? (
            <div className={cn('px-3 py-2 text-ink3', chromeText.base)}>No matches.</div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => exec(c)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left',
                  i === clampedSel ? 'bg-accentbg text-accent' : 'text-ink2 hover:bg-panel2',
                )}
              >
                <span className="truncate">{c.label}</span>
                {c.hint && <ChromeHint className="shrink-0">{c.hint}</ChromeHint>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="keyboard shortcuts"
    >
      <div
        className="w-[340px] max-w-[90vw] rounded-[var(--radius)] border border-edge bg-panel p-3 shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className={cn('font-semibold text-ink', chromeText.base)}>Keyboard shortcuts</span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-5 w-5 place-items-center rounded-md text-ink3 hover:bg-panel2 hover:text-ink"
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-2">
              <span className={cn(chromeText.tight, 'text-ink2')}>{s.label}</span>
              <span className="flex gap-0.5">
                {s.keys.map((k) => (
                  <kbd key={k} className={cn('rounded border border-edge bg-panel2 px-1 py-px font-mono text-ink', chromeText.sm)}>
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoPreview({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <FileQuestion className="h-6 w-6 text-ink3" />
      <div className={cn('text-ink', chromeText.base)}>{title}</div>
      <div className={cn('max-w-sm text-ink2', chromeText.base)}>
        This item has no interactive preview yet — it isn’t bound to a plugin.
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {tags.map((t) => (
          <TagChip key={t} id={t} />
        ))}
      </div>
    </div>
  );
}
