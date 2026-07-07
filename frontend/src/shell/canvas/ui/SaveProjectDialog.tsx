import { useState } from 'react';
import { Download } from 'lucide-react';
import { chromeText } from '../../chromeUi';
import { downloadProjectState, type ProjectState } from '@/store/project-state';

export function SaveProjectDialog({ state }: { state: ProjectState | null }) {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState('algo-moves-project');

  if (!state) return null;

  const save = () => {
    const name = filename.trim() || 'algo-moves-project';
    downloadProjectState(state, `${name}.json`);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Save project"
        className="flex items-center gap-1 rounded-md border border-edge px-2 py-1 text-ink2 hover:bg-panel2"
      >
        <Download className="h-3.5 w-3.5" />
        <span className={chromeText.sm}>Save</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-edge bg-panel p-4 shadow-theme-lg">
            <h3 className={chromeText.base}>Save project</h3>
            <label className="mt-3 block text-ink3">
              <span className={chromeText.sm}>Filename</span>
              <input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="mt-1 w-full rounded border border-edge bg-panel2 px-2 py-1.5"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-edge px-3 py-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded bg-accent px-3 py-1 text-white"
              >
                Download JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
