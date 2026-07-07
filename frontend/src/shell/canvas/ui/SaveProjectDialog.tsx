import { useId, useState } from 'react';
import { Download, X } from 'lucide-react';
import { chromeText } from '../../chromeUi';
import { downloadProjectState, type ProjectState } from '@/store/project-state';

export function SaveProjectDialog({ state }: { state: ProjectState | null }) {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState('algo-moves-project');
  const titleId = useId();
  const filenameId = useId();

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
        aria-expanded={open}
        className="project-action-btn save-project-trigger flex items-center gap-1 rounded-md border border-edge px-2 py-1 text-ink2 hover:bg-panel2"
      >
        <Download className="h-3.5 w-3.5" />
        <span className={chromeText.sm}>Save</span>
      </button>
      {open && (
        <div
          className="project-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <div
            className="project-dialog w-full max-w-sm overflow-hidden rounded-3xl border border-edge bg-[var(--surface-glass)] shadow-theme-xl ring-1 ring-accent/10 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-2 border-b border-edge bg-panel/40 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
                <Download className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3
                  id={titleId}
                  className={`project-dialog__title font-semibold text-ink ${chromeText.base}`}
                >
                  Save project
                </h3>
                <p className={`truncate text-ink3 ${chromeText.xs}`}>
                  Export the current canvas as JSON.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
                aria-label="Close save project dialog"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>
            <div className="p-4">
              <label className="project-dialog__label block text-ink3" htmlFor={filenameId}>
                <span className={chromeText.sm}>Filename</span>
                <input
                  id={filenameId}
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="project-dialog__input mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-ink outline-none focus:border-accent"
                />
              </label>
            </div>
            <div className="project-dialog__actions flex justify-end gap-2 border-t border-edge bg-panel/30 px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="project-dialog__cancel rounded-xl border border-edge px-3 py-1.5 text-sm font-medium text-ink2 transition hover:bg-panel2 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="project-dialog__primary rounded-xl bg-accent px-3 py-1.5 text-sm font-semibold text-[var(--accent-contrast)] shadow-theme-sm transition hover:opacity-90"
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
