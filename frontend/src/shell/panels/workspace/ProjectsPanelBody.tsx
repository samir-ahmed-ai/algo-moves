import { useState } from 'react';
import { FolderOpen, Trash2 } from 'lucide-react';
import { catalog } from '../../../content';
import { useWorkspace, normalizeThemePreset } from '@/store/workspace';
import { useProjects, saveProject, deleteProject } from '@/store/persistence';
import type { ShareState } from '@/store/navigation';
import { buildMinimalProjectState, type ProjectState } from '@/store/project-state';
import { ShareUrlPopover } from '../../canvas/ui/ShareUrlPopover';
import { SaveProjectDialog } from '../../canvas/ui/SaveProjectDialog';
import { cn } from '@/lib/utils/cn';
import { CHROME_BTN } from '../../chrome';
import { Btn, EmptyState, Field, nodeIconGlyph, Row, Section, TextInput, Pill, nodeText, nodeTextWrap, RADIUS_CTRL } from '../../canvas/ui/nodeui';

/** Projects: save/load named workspace snapshots with full canvas state when available. */
export function ProjectsPanelBody() {
  const ws = useWorkspace();
  const { canvasProject } = ws;
  const projects = useProjects();
  const [name, setName] = useState('');
  const names = Object.keys(projects).sort();

  const snapshot = (): ShareState => ({
    item: ws.activeItemId,
    mode: ws.mode,
    theme: ws.theme,
    palette: ws.palette,
    themePreset: ws.themePreset,
    dir: ws.dir,
  });

  const projectState: ProjectState =
    canvasProject?.getProjectState() ?? buildMinimalProjectState(snapshot(), ws.mode, [], []);

  const apply = (s: ShareState) => {
    if (s.focus === 'canvas' || (s.mode === 'visualize' && !s.item)) {
      ws.enterCanvas();
    } else if (s.item && catalog.getItem(s.item)) {
      ws.openProblem(s.item);
      if (s.mode === 'play') ws.setMode('play');
      else if (s.mode === 'learn' || s.mode === 'practice' || s.mode === 'code') ws.setMode('learn');
    } else if (s.mode === 'visualize') {
      ws.enterCanvas();
    } else if (s.mode === 'learn' || s.mode === 'practice' || s.mode === 'code') {
      ws.setMode('learn');
    } else if (s.mode === 'play') {
      ws.setMode('play');
    }
    if (s.theme) ws.setTheme(s.theme === 'light' ? 'light' : 'dark');
    ws.setPalette(s.palette === 'cb' ? 'cb' : 'default');
    if (s.themePreset) ws.setThemePreset(normalizeThemePreset(s.themePreset));
    if (s.dir === 'TB' || s.dir === 'LR') ws.setDir(s.dir);
  };

  const save = () => {
    const n = name.trim();
    if (!n) return;
    saveProject(n, snapshot());
    setName('');
  };

  return (
    <div className="nodrag flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <ShareUrlPopover state={projectState} dense />
        <SaveProjectDialog state={projectState} />
      </div>
      <Field label="New workspace" hint="Captures problem · mode · theme · canvas when on visualize">
        <div className="flex gap-1.5">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="project name…"
            className="min-w-0 flex-1"
          />
          <Btn variant="good" size="sm" onClick={save} disabled={!name.trim()}>
            Save
          </Btn>
        </div>
      </Field>
      {names.length === 0 ? (
        <EmptyState icon={<FolderOpen />} title="No saved workspaces" hint="Name the current setup and Save." />
      ) : (
        <Section title="Saved" right={<Pill>{names.length}</Pill>}>
          <div className="flex flex-col">
            {names.map((n) => (
              <Row key={n} className="justify-between gap-1.5 border-t border-edge py-1.5 first:border-t-0">
                <span className={cn('min-w-0 flex-1 text-ink', nodeTextWrap, nodeText.sm)}>{n}</span>
                <Btn variant="ghost" size="xs" onClick={() => apply(projects[n])}>
                  Load
                </Btn>
                <button
                  type="button"
                  onClick={() => deleteProject(n)}
                  className={`nodrag grid ${CHROME_BTN} place-items-center text-ink3 transition-colors hover:bg-badbg hover:text-bad ${RADIUS_CTRL}`}
                  aria-label="delete project"
                >
                  <Trash2 className={nodeIconGlyph} />
                </button>
              </Row>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
