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
        aria-haspopup="dialog"
        className="project-action-btn save-project-trigger flex items-center gap-1 rounded-md border border-edge px-2 py-1 text-ink2 hover:bg-panel2"
      >
        <Download className="h-3.5 w-3.5" />
        <span className={chromeText.sm}>Save</span>
      </button>
      {open && (
        <div className="project-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="project-dialog w-full max-w-sm rounded-lg border border-edge bg-panel p-4 shadow-theme-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Save project"
          >
            <h3 className={`project-dialog__title ${chromeText.base}`}>Save project</h3>
            <label className="project-dialog__label mt-3 block text-ink3">
              <span className={chromeText.sm}>Filename</span>
              <input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="project-dialog__input mt-1 w-full rounded border border-edge bg-panel2 px-2 py-1.5"
              />
            </label>
            <div className="project-dialog__actions mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="project-dialog__cancel rounded border border-edge px-3 py-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="project-dialog__primary rounded bg-accent px-3 py-1 text-white"
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
