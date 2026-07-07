import { useMemo, useState } from 'react';
import { useWorkspace } from '@/store/workspace';
import { catalog, getSiblingItems } from '@/content';
import { useNarration, useSoundCues } from '@/hooks';
import { cn } from '@/lib/utils/cn';
import { WorkspaceMenu } from './workspace/WorkspaceMenu';
import { MobileSwipeReturn } from './mobile/deck/MobileSwipeReturn';
import { CommandPalette, ModeRouter, PresentationModeHint, ShortcutsOverlay, useWorkspaceKeyboard, useWorkspaceRuntime } from '@/shell/workspace/index';
import { SettingsDialog, MobileTransportSheet } from '@/shell/canvas';
import { PlanTray } from './plans/PlanTray';
import { PlanRunner } from './plans/PlanRunner';
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
    openProblem,
  } = useWorkspace();
  const narrate = tweaks.narrate;
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { item, plugin, pluginLoading, inputId, customInput, setCustomInput, selectInput, frames, runtimeError, player, frame } =
    useWorkspaceRuntime(activeItemId);

  const siblings = useMemo(() => getSiblingItems(activeItemId, catalog), [activeItemId]);
  const siblingIdx = siblings.findIndex((i) => i.id === activeItemId);
  const hasSiblingNav =
    problemFocused && (mode === 'learn' || mode === 'play') && siblings.length >= 2 && siblingIdx >= 0;

  const goSibling = (delta: number) => {
    const n = (siblingIdx + delta + siblings.length) % siblings.length;
    openProblem(siblings[n].id);
  };

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
    hasSiblingNav,
    onPrevProblem: hasSiblingNav ? () => goSibling(-1) : undefined,
    onNextProblem: hasSiblingNav ? () => goSibling(1) : undefined,
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
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col h-full">
        {/* Plan run-mode bar appears above the workspace menu when a run is active */}
        <PlanRunner />

        {!present && mode !== 'visualize' && mode !== 'learn' && mode !== 'play' && (
          <WorkspaceMenu
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenHelp={() => setHelpOpen(true)}
          />
        )}
        <div className="min-h-0 flex-1 overflow-hidden">
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
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenHelp={() => setHelpOpen(true)}
          />
        </div>
      </div>

      {/* Plan builder tray docked to the right */}
      <PlanTray />

      {present && <PresentationModeHint />}

      {helpOpen && <ShortcutsOverlay onClose={() => setHelpOpen(false)} />}
      {paletteOpen && <CommandPalette inputId={inputId} onClose={() => setPaletteOpen(false)} />}
      <MobileTransportSheet open={mobileTransportOpen} onClose={() => setMobileTransportOpen(false)} />
      <MobileSwipeReturn />
      <SettingsDialog />
    </div>
  );
}
