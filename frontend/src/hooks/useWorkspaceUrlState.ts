import { useEffect, useRef, useState } from 'react';
import { getLoadedPlugin, type ProblemPlugin } from '@/core';
import { catalog } from '@/content';
import { useWorkspace, normalizeThemePreset } from '@/store/workspace';
import { resolveShareItemId, readShareFromUrl, writeShareToUrl } from '@/store/navigation';
import { loadProjectFromUrl } from '@/store/project-state';

/**
 * Two-way sync between the URL and the workspace's per-problem view state, extracted
 * from Workspace: which sample `input` is selected (+ custom edits), one-time project
 * hydration from a `?state=` link, and writing the share hash back on every change.
 * Pulls the workspace setters from context itself so the call site stays tiny.
 */
export function useWorkspaceUrlState(
  plugin: ProblemPlugin<any, any> | undefined,
  activeItemId: string,
) {
  const {
    openProblem,
    enterCanvas,
    setMode,
    setTheme,
    setPalette,
    setThemePreset,
    setDir,
    canvasProject,
    canvasVariant,
    mode,
    theme,
    palette,
    themePreset,
    dir,
    problemFocused,
  } = useWorkspace();

  const [inputId, setInputId] = useState(() => {
    // Capture the shared input from the URL at mount — the plugin loads async, so
    // waiting for it here would let the share-writer effect clobber the hash first.
    // The restore effect below validates/clamps it once the plugin resolves.
    const shared = readShareFromUrl();
    const sharedItemId = resolveShareItemId(shared);
    if (sharedItemId === activeItemId && shared?.input) return shared.input;
    return plugin?.inputs[0]?.id ?? '';
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
    const sharedItemId = resolveShareItemId(shared);
    const fromUrl =
      sharedItemId === activeItemId &&
      shared?.input &&
      plugin.inputs.some((i) => i.id === shared.input)
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
      if (s.focus === 'canvas' || (s.mode === 'visualize' && !s.item)) {
        enterCanvas();
      } else if (s.mode === 'visualize') {
        enterCanvas();
      } else if (s.mode === 'learn' || s.mode === 'practice' || s.mode === 'code') {
        setMode('learn');
      } else if (s.mode === 'play') {
        setMode('play');
      }
      if (s.theme) setTheme(s.theme === 'light' ? 'light' : 'dark');
      if (s.palette) setPalette(s.palette === 'cb' ? 'cb' : 'default');
      if (s.themePreset) setThemePreset(normalizeThemePreset(s.themePreset));
      if (s.dir === 'TB' || s.dir === 'LR') setDir(s.dir);
      if (s.input) {
        // Best-effort: validate against the plugin only if its chunk is already
        // loaded. Otherwise the input effect re-validates once the plugin resolves.
        const targetPlugin = s.item
          ? getLoadedPlugin(catalog.getItem(s.item)?.pluginId ?? '')
          : plugin;
        const validInput =
          targetPlugin && targetPlugin.inputs.some((i) => i.id === s.input) ? s.input : null;
        if (validInput) setInputId(validInput);
      }
    }

    if (canvasAppliedRef.current || !canvasProject) return;
    canvasAppliedRef.current = true;
    const t = window.setTimeout(() => canvasProject.applyProjectState(project), 100);
    return () => window.clearTimeout(t);
  }, [canvasProject]);

  // Persist problem, example, mode, and theme in the URL so refresh reopens the same view.
  // Preserve room/sessionKind/guestToken so invite links survive hash rewrites.
  useEffect(() => {
    if (pendingProjectHydration.current && !shareHydratedRef.current) return;

    const preserved = readShareFromUrl();
    const roomFields = {
      ...(preserved?.room ? { room: preserved.room } : {}),
      ...(preserved?.sessionKind ? { sessionKind: preserved.sessionKind } : {}),
      ...(preserved?.guestToken ? { guestToken: preserved.guestToken } : {}),
    };

    if (mode === 'visualize' && !problemFocused) {
      writeShareToUrl({
        mode,
        focus: 'canvas',
        ...(canvasVariant === 'interview' ? { variant: 'interview' as const } : {}),
        theme,
        palette,
        themePreset,
        dir,
        ...roomFields,
      });
      return;
    }

    if (!activeItemId) return;
    writeShareToUrl({
      item: activeItemId,
      ...(plugin?.meta.number ? { id: plugin.meta.number } : {}),
      ...(inputId ? { input: inputId } : {}),
      mode,
      focus: 'problem',
      theme,
      palette,
      themePreset,
      dir,
      ...roomFields,
    });
  }, [
    activeItemId,
    inputId,
    mode,
    theme,
    palette,
    themePreset,
    dir,
    problemFocused,
    canvasVariant,
    plugin?.meta.number,
  ]);

  // Picking a different sample clears any custom edits.
  const selectInput = (id: string) => {
    setInputId(id);
    setCustomInput(null);
  };

  return { inputId, customInput, setCustomInput, selectInput };
}
