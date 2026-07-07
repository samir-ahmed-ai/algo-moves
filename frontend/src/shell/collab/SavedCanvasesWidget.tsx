import { useCallback, useEffect, useState } from 'react';
import { Save, FolderOpen, Trash2, Loader2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { chromeText } from '@/shell/chromeUi';
import type { CanvasWidget } from '@/shell/canvas/widgets/types';
import { isArcadeConfigured } from '@/platform';
import { useAuth } from '@/shell/auth/AuthProvider';
import {
  createCanvas,
  deleteCanvas,
  fetchCanvas,
  listCanvases,
  type SavedCanvasSummary,
} from './sync/canvasStore';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function SavedCanvasesBody() {
  const { canvasProject } = useWorkspace();
  const { ensureSignedIn } = useAuth();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<SavedCanvasSummary[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.resolve(isArcadeConfigured()).then((ok) => {
      if (alive) setConfigured(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setItems(await listCanvases());
  }, []);

  useEffect(() => {
    if (configured) void refresh();
  }, [configured, refresh]);

  const save = useCallback(async () => {
    if (!canvasProject) return;
    setBusy(true);
    try {
      await ensureSignedIn();
      const doc = canvasProject.getProjectState();
      await createCanvas(title.trim() || 'Untitled canvas', doc);
      setTitle('');
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [canvasProject, ensureSignedIn, title, refresh]);

  const open = useCallback(
    async (id: string) => {
      if (!canvasProject) return;
      const saved = await fetchCanvas(id);
      if (saved)
        canvasProject.applyProjectState(
          saved.doc as ReturnType<typeof canvasProject.getProjectState>,
        );
    },
    [canvasProject],
  );

  const remove = useCallback(
    async (id: string) => {
      if (await deleteCanvas(id)) await refresh();
    },
    [refresh],
  );

  if (configured === null) {
    return (
      <div className="flex items-center gap-2 p-3 text-ink3">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className={chromeText.sm}>Loading…</span>
      </div>
    );
  }

  if (!configured) {
    return (
      <p className={cn('p-3 text-ink3', chromeText.sm)}>
        Sign-in / server not available. Saved canvases are unavailable in this environment.
      </p>
    );
  }

  const disabled = !canvasProject || busy;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-2">
        <span className={cn('text-ink3', chromeText.xs)}>Save current canvas</span>
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled canvas"
            disabled={disabled}
            className={cn(
              'min-w-0 flex-1 rounded border border-edge bg-panel2 px-2 py-1.5 text-ink',
              chromeText.sm,
            )}
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={disabled}
            title="Save current canvas"
            className="flex items-center gap-1 rounded-md bg-accent px-2 py-1.5 text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span className={chromeText.sm}>Save</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {items.length === 0 ? (
          <p className={cn('text-ink3', chromeText.xs)}>No saved canvases yet.</p>
        ) : (
          items.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-md border border-edge bg-panel2 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <div className={cn('truncate text-ink', chromeText.sm)}>{c.title}</div>
                <div className={cn('text-ink3', chromeText.xs)}>{relativeTime(c.updatedAt)}</div>
              </div>
              <button
                type="button"
                onClick={() => void open(c.id)}
                disabled={!canvasProject}
                title="Open canvas"
                className="flex items-center gap-1 rounded border border-edge px-1.5 py-1 text-ink2 hover:bg-panel disabled:opacity-50"
              >
                <FolderOpen className="h-3 w-3" />
                <span className={chromeText.xs}>Open</span>
              </button>
              <button
                type="button"
                onClick={() => void remove(c.id)}
                title="Delete canvas"
                className="flex items-center rounded border border-edge px-1.5 py-1 text-ink2 hover:bg-panel"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const SAVED_CANVASES_WIDGET: CanvasWidget = {
  id: 'saved-canvases',
  title: 'Saved canvases',
  icon: <Archive className="h-3 w-3" />,
  tab: 'more',
  order: 50,
  Body: SavedCanvasesBody,
};
