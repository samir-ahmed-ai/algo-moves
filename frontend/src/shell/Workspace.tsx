import { useState } from 'react';
import { useWorkspace } from '@/store/workspace';
import { useNarration, useSoundCues } from '@/hooks';
import { cn } from '@/lib/utils/cn';
import { WorkspaceMenu } from './workspace/WorkspaceMenu';
import { MobileSwipeReturn } from './mobile/deck/MobileSwipeReturn';
import { CommandPalette, ModeRouter, PresentationModeHint, ShortcutsOverlay, useWorkspaceKeyboard, useWorkspaceRuntime } from '@/shell/workspace/index';

import { SettingsDialog, MobileTransportSheet } from '@/shell/canvas';
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
    toggleFocusCanvas,
  } = useWorkspace();
  const narrate = tweaks.narrate;
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { item, plugin, pluginLoading, inputId, customInput, setCustomInput, selectInput, frames, runtimeError, player, frame } =
    useWorkspaceRuntime(activeItemId);

  useWorkspaceKeyboard({
    mode,
    present,
    setPresent,
    player,
    helpOpen,
    paletteOpen,
    setHelpOpen,
    setPaletteOpen,
    toggleFocusCanvas,
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
      <div className="relative min-h-0 min-w-0 flex-1 h-full">
        {!present && mode !== 'visualize' && (
          <WorkspaceMenu
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenHelp={() => setHelpOpen(true)}
          />
        )}
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
          frames={frames}
          runtimeError={runtimeError}
          player={player}
          frame={frame}
          backToBrowse={backToBrowse}
          goHome={goHome}
        />
      </div>

      {present && <PresentationModeHint />}

      {helpOpen && <ShortcutsOverlay onClose={() => setHelpOpen(false)} />}
      {paletteOpen && <CommandPalette inputId={inputId} onClose={() => setPaletteOpen(false)} />}
      <MobileTransportSheet open={mobileTransportOpen} onClose={() => setMobileTransportOpen(false)} />
      <MobileSwipeReturn />
      <SettingsDialog />
    </div>
  );
}
