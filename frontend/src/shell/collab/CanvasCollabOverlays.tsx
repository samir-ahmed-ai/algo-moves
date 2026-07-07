import { useState } from 'react';
import { ViewportPortal, useReactFlow } from '@xyflow/react';
import { Check, MessageSquare, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { RADIUS_CTRL } from '@/shell/canvas/ui/nodeui';
import { useCanvasCollab, type PeerPresence } from './CanvasCollabProvider';
import type { CanvasComment } from './protocol/collabProtocol';

/** SVG cursor glyph + name tag for one peer, positioned in flow coords. */
function PeerCursor({ peer }: { peer: PeerPresence }) {
  if (!peer.cursor) return null;
  return (
    <div
      className="pointer-events-none absolute -translate-x-[2px] -translate-y-[2px] select-none"
      style={{ left: peer.cursor.x, top: peer.cursor.y, zIndex: 40 }}
    >
      <svg width={18} height={18} viewBox="0 0 18 18" fill="none" style={{ display: 'block' }}>
        <path
          d="M2 2 L2 15 L6 11 L9 16 L11 15 L8 10 L14 10 Z"
          fill={peer.color}
          stroke="var(--bg)"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn(
          'absolute left-3 top-3 whitespace-nowrap rounded px-1.5 py-0.5 font-medium text-white shadow-sm',
          chromeText.tight,
        )}
        style={{ background: peer.color }}
      >
        {peer.name}
      </span>
    </div>
  );
}

/** Colored ring around one node the peer has selected. */
function SelectionHalo({ nodeId, color }: { nodeId: string; color: string }) {
  const { getInternalNode } = useReactFlow();
  const node = getInternalNode(nodeId);
  if (!node) return null;
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured.width ?? node.width ?? 0;
  const h = node.measured.height ?? node.height ?? 0;
  if (!w || !h) return null;
  return (
    <div
      className="pointer-events-none absolute rounded-[calc(var(--radius)+3px)]"
      style={{
        left: x - 3,
        top: y - 3,
        width: w + 6,
        height: h + 6,
        border: `2px solid ${color}`,
        boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)`,
        zIndex: 30,
      }}
    />
  );
}

/** Faint colored ghost dot where a peer is mid-drag. */
function DragGhost({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left: x,
        top: y,
        width: 10,
        height: 10,
        background: color,
        opacity: 0.5,
        zIndex: 25,
      }}
    />
  );
}

/** A comment pin + click-to-open popover. Interactive within a non-interactive layer. */
function CommentPin({ comment }: { comment: CanvasComment }) {
  const { self, replyComment, resolveComment, removeComment } = useCanvasCollab();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const isAuthor = self?.id === comment.authorId;

  const submitReply = () => {
    const text = reply.trim();
    if (!text) return;
    replyComment(comment.id, text);
    setReply('');
  };

  return (
    <div className="absolute" style={{ left: comment.x, top: comment.y, zIndex: 50 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'pointer-events-auto grid h-6 w-6 -translate-x-1/2 -translate-y-full place-items-center rounded-full rounded-bl-none border border-edge text-white shadow-[var(--shadow-md)] transition-transform hover:scale-110',
          comment.resolved && 'opacity-50',
        )}
        style={{ background: comment.resolved ? 'var(--ink3)' : 'var(--accent)' }}
        title={comment.resolved ? 'Resolved comment' : 'Comment'}
      >
        <MessageSquare className="h-3 w-3" />
      </button>

      {open && (
        <div
          className={cn(
            'nowheel nodrag pointer-events-auto absolute left-2 top-1 w-64 overflow-hidden rounded-[var(--radius)] border border-edge bg-panel shadow-[var(--shadow-xl)]',
            comment.resolved && 'opacity-80',
          )}
        >
          <div className="flex flex-col gap-1.5 p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn(chromeText.sm, 'font-semibold text-ink')}>
                {comment.authorName}
              </span>
              {comment.resolved && (
                <span className={cn(chromeText.tight, 'text-good')}>Resolved</span>
              )}
            </div>
            <p className={cn(chromeText.sm, 'break-words text-ink2')}>{comment.text}</p>

            {comment.replies.length > 0 && (
              <div className="mt-1 flex flex-col gap-1.5 border-t border-edge pt-1.5">
                {comment.replies.map((r) => (
                  <div key={r.id} className="flex flex-col gap-0.5">
                    <span className={cn(chromeText.tight, 'font-medium text-ink3')}>
                      {r.authorName}
                    </span>
                    <p className={cn(chromeText.sm, 'break-words text-ink2')}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 border-t border-edge bg-panel2 p-1.5">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitReply();
                }
              }}
              placeholder="Reply…"
              className={cn(
                'min-w-0 flex-1 border border-edge bg-panel px-1.5 py-1 text-ink outline-none placeholder:text-ink3 focus:border-accent',
                chromeText.sm,
                RADIUS_CTRL,
              )}
            />
            <button
              type="button"
              onClick={submitReply}
              title="Send reply"
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center text-ink3 transition-colors hover:text-accent',
                RADIUS_CTRL,
              )}
            >
              <Send className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-1 border-t border-edge px-1.5 py-1">
            <button
              type="button"
              onClick={() => resolveComment(comment.id, !comment.resolved)}
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 text-ink3 transition-colors hover:text-good',
                chromeText.tight,
                RADIUS_CTRL,
              )}
            >
              <Check className="h-3 w-3" />
              {comment.resolved ? 'Reopen' : 'Resolve'}
            </button>
            {isAuthor && (
              <button
                type="button"
                onClick={() => removeComment(comment.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 text-ink3 transition-colors hover:text-bad',
                  chromeText.tight,
                  RADIUS_CTRL,
                )}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Real-time presence + comment overlays rendered inside <ReactFlow> via
 * <ViewportPortal> so they live in flow-space and track pan/zoom. Renders
 * nothing outside an active collab session.
 */
export function CanvasCollabOverlays() {
  const { isCollaborating, peers, comments } = useCanvasCollab();
  if (!isCollaborating) return null;

  return (
    <ViewportPortal>
      {peers.map((peer) => (
        <PeerCursor key={`cursor-${peer.id}`} peer={peer} />
      ))}

      {peers.flatMap((peer) =>
        peer.selection.map((nodeId) => (
          <SelectionHalo key={`sel-${peer.id}-${nodeId}`} nodeId={nodeId} color={peer.color} />
        )),
      )}

      {peers.flatMap((peer) =>
        Object.entries(peer.drags).map(([nodeId, pos]) => (
          <DragGhost key={`drag-${peer.id}-${nodeId}`} x={pos.x} y={pos.y} color={peer.color} />
        )),
      )}

      {comments.map((comment) => (
        <CommentPin key={`comment-${comment.id}`} comment={comment} />
      ))}
    </ViewportPortal>
  );
}
