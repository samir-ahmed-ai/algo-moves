import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { MessageSquarePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../chromeUi';
import { RADIUS_CTRL } from '../ui/nodeui';
import { useCanvasCollab } from './CanvasCollabProvider';

interface Draft {
  /** Screen-space position within the flow container, for the composer box. */
  sx: number;
  sy: number;
  /** Flow-space anchor stored on the comment. */
  fx: number;
  fy: number;
}

/**
 * Comment authoring, rendered as a ReactFlow child (screen space). A toggle
 * enters placement mode; the next click on the pane drops a composer whose text
 * becomes a pinned comment. Pins themselves are drawn by CanvasCollabOverlays.
 * Renders nothing outside a session.
 */
export function CommentLayer() {
  const { isCollaborating, addComment } = useCanvasCollab();
  const { screenToFlowPosition } = useReactFlow();
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState('');

  if (!isCollaborating) return null;

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDraft({ sx: e.clientX - rect.left, sy: e.clientY - rect.top, fx: flow.x, fy: flow.y });
    setPlacing(false);
    setText('');
  };

  const submit = () => {
    if (draft && text.trim()) addComment(draft.fx, draft.fy, text);
    setDraft(null);
    setText('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPlacing((p) => !p);
          setDraft(null);
        }}
        title={placing ? 'Cancel comment' : 'Add a comment'}
        className={cn(
          'absolute bottom-2 left-2 z-[6] inline-flex items-center gap-1 border border-edge px-2 py-1 shadow-[var(--shadow-md)] transition-colors',
          chromeText.sm,
          RADIUS_CTRL,
          placing ? 'bg-accent text-white' : 'bg-panel text-ink2 hover:text-accent',
        )}
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        {placing ? 'Click canvas…' : 'Comment'}
      </button>

      {placing && (
        <div className="absolute inset-0 z-[6] cursor-crosshair" onClick={place} aria-hidden />
      )}

      {draft && (
        <div
          className="nowheel nodrag absolute z-[7] w-56 overflow-hidden rounded-[var(--radius)] border border-edge bg-panel shadow-[var(--shadow-xl)]"
          style={{ left: draft.sx, top: draft.sy }}
        >
          <div className="flex items-center justify-between border-b border-edge px-2 py-1">
            <span className={cn(chromeText.tight, 'font-medium text-ink3')}>New comment</span>
            <button type="button" onClick={() => setDraft(null)} title="Discard" className="text-ink3 hover:text-ink">
              <X className="h-3 w-3" />
            </button>
          </div>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
              if (e.key === 'Escape') setDraft(null);
            }}
            placeholder="Leave a comment…  (⌘⏎ to post)"
            className={cn('h-16 w-full resize-none bg-panel px-2 py-1.5 text-ink outline-none placeholder:text-ink3', chromeText.sm)}
          />
          <div className="flex justify-end border-t border-edge bg-panel2 px-1.5 py-1">
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim()}
              className={cn(
                'px-2 py-0.5 font-medium transition-colors disabled:opacity-40',
                chromeText.tight,
                RADIUS_CTRL,
                'bg-accent text-white hover:bg-accent/90',
              )}
            >
              Post
            </button>
          </div>
        </div>
      )}
    </>
  );
}
