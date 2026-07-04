import { useMemo, useState } from 'react';
import { usePlayer } from '../core';
import { catalog } from '../content';
import { useWorkspace } from '@/store/workspace';
import { useNarration, useSoundCues, useWorkspacePlugin, useWorkspaceUrlState } from '@/hooks';
import { cn } from '@/lib/utils/cn';
import { UnifiedLeftSidebar } from './UnifiedLeftSidebar';
import { SettingsDialog } from './canvas/ui/SettingsDialog';
import { MobileTransportSheet } from './canvas/ui/MobileTransportSheet';
import { MobileSwipeReturn } from './mobile/deck/MobileSwipeReturn';
import { chromeText } from './chromeUi';
import { CommandPalette, ModeRouter, ShortcutsOverlay, useWorkspaceKeyboard } from '@/shell/workspace/index';

export function Workspace() {
  const {
    density,
    present,
    setPresent,
    tweaks,
    activeItemId,
    activeTrackId,
    activeCategoryId,
    problemFocused,
    mode,
    backToBrowse,
    goHome,
    mobileTransportOpen,
    setMobileTransportOpen,
  } = useWorkspace();
  const narrate = tweaks.narrate;
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const item = catalog.getItem(activeItemId) ?? catalog.items[0];
  const pluginId = item?.pluginId;

  // The heavy plugin implementation loads on demand (its group's chunk); show a
  // loading state until its chunk resolves.
  const { plugin, pluginLoading } = useWorkspacePlugin(pluginId);

  // Sample input + share/project URL hydration (writes the share hash on change).
  const { inputId, customInput, setCustomInput, selectInput } = useWorkspaceUrlState(plugin, activeItemId);

  const input = plugin?.inputs.find((i) => i.id === inputId) ?? plugin?.inputs[0];
  const effectiveValue = customInput ?? input?.value;
  const baseFrames = useMemo(
    () => (plugin && effectiveValue != null ? plugin.record(effectiveValue) : []),
    [plugin, effectiveValue],
  );
  const player = usePlayer(Math.max(baseFrames.length, 1));
  const frame = baseFrames[player.index] ?? baseFrames[0];

  useWorkspaceKeyboard({
    mode,
    present,
    setPresent,
    player,
    helpOpen,
    setHelpOpen,
    setPaletteOpen,
  });

  // Text-to-speech narration + per-step sound cues.
  useNarration(narrate, frame?.move.caption);
  useSoundCues(tweaks.sound, frame);

  return (
    <div
      data-density={density}
      className={cn(
        'relative flex h-full w-full overflow-hidden bg-bg',
        !tweaks.animate && '[&_*]:!transition-none [&_*]:!animate-none',
      )}
    >
      {!present && mode !== 'visualize' && <UnifiedLeftSidebar />}

      <div className="relative min-h-0 min-w-0 flex-1 h-full">
        <ModeRouter
          activeTrackId={activeTrackId}
          activeCategoryId={activeCategoryId}
          problemFocused={problemFocused}
          mode={mode}
          pluginLoading={pluginLoading}
          plugin={plugin}
          item={item}
          inputId={inputId}
          selectInput={selectInput}
          customInput={customInput}
          setCustomInput={setCustomInput}
          frames={baseFrames}
          player={player}
          frame={frame}
          backToBrowse={backToBrowse}
          goHome={goHome}
        />
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
