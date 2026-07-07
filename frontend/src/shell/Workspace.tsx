import { useMemo, useState } from 'react';
import { useWorkspace } from '@/store/workspace';
import { catalog, getSiblingItems } from '@/content';
import { useNarration, useSoundCues } from '@/hooks';
import { cn } from '@/lib/utils/cn';
import { WorkspaceMenu } from './workspace/WorkspaceMenu';
import { MobileSwipeReturn } from './mobile/deck/MobileSwipeReturn';
import {
  CommandPalette,
  ModeRouter,
  PresentationModeHint,
  ShortcutsOverlay,
  useWorkspaceKeyboard,
  useWorkspaceRuntime,
} from '@/shell/workspace/index';
import { MobileTransportSheet } from '@/shell/canvas';
import { PlanTray } from './plans/PlanTray';
import { PlanRunner } from './plans/PlanRunner';
import { usePlan } from './plans/PlanContext';
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
  const {
    item,
    plugin,
    pluginLoading,
    inputId,
    customInput,
    setCustomInput,
    selectInput,
    frames,
    runtimeError,
    player,
    frame,
  } = useWorkspaceRuntime(activeItemId);

  const { isRunning, itemIds, runnerIndex, prevItem, nextItem } = usePlan();

  const siblings = useMemo(() => getSiblingItems(activeItemId, catalog), [activeItemId]);
  const siblingIdx = siblings.findIndex((i) => i.id === activeItemId);

  const navList = isRunning ? itemIds : siblings.map((i) => i.id);
  const navIdx = isRunning ? runnerIndex : siblingIdx;
  const hasSiblingNav =
    problemFocused &&
    (mode === 'learn' || mode === 'play') &&
    navList.length >= 2 &&
    navIdx >= 0 &&
    navIdx < navList.length;

  const goNav = (delta: number) => {
    if (isRunning) {
      if (delta < 0) prevItem();
      else nextItem();
      return;
    }
    const n = (siblingIdx + delta + siblings.length) % siblings.length;
    const target = siblings[n];
    if (target) openProblem(target.id);
  };

  const canPrevNav = hasSiblingNav && (!isRunning || navIdx > 0);
  const canNextNav = hasSiblingNav && (!isRunning || navIdx < navList.length - 1);

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
    hasPrevProblemNav: canPrevNav,
    hasNextProblemNav: canNextNav,
    ...(canPrevNav ? { onPrevProblem: () => goNav(-1) } : {}),
    ...(canNextNav ? { onNextProblem: () => goNav(1) } : {}),
  });

  // Text-to-speech narration + per-step sound cues.
  useNarration(narrate, frame?.move.caption);
  useSoundCues(tweaks.sound, frame);

  return (
    <div
      data-density={density}
      data-present={present ? 'true' : 'false'}
      data-surface="workspace"
      aria-label="Algo Moves workspace"
      className={cn(
        'shell-workspace relative isolate flex h-full w-full overflow-hidden bg-bg [background:radial-gradient(circle_at_16%_0%,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_28rem),radial-gradient(circle_at_90%_12%,rgba(248,214,121,0.08),transparent_24rem),var(--bg)]',
        present && 'shell-workspace--present',
        !tweaks.animate && '[&_*]:!transition-none [&_*]:!animate-none',
      )}
    >
      <div className="shell-workspace__main relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
        {/* Plan run-mode bar appears above the workspace menu when a run is active */}
        <PlanRunner />

        {!present && mode !== 'visualize' && mode !== 'learn' && mode !== 'play' && (
          <WorkspaceMenu
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenHelp={() => setHelpOpen(true)}
          />
        )}
        <div className="shell-workspace__stage min-h-0 flex-1 overflow-hidden">
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
      <MobileTransportSheet
        open={mobileTransportOpen}
        onClose={() => setMobileTransportOpen(false)}
      />
      <MobileSwipeReturn />
    </div>
  );
}
