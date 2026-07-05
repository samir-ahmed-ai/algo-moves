import { useCallback, useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { CalendarClock, Loader2, LogIn, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import type { PanelFlowNode } from '@/shell/panels/panelTypes';
import { chromeText } from '../../../chromeUi';
import { RADIUS_CTRL } from '../../ui/nodeui';
import type { CanvasWidget } from '../../widgets/types';
import { isArcadeConfigured } from '../../../games/data/arcadeClient';
import { useAuth } from '../../../games/data/AuthProvider';
import { useCanvasCollab } from '../CanvasCollabProvider';
import { buildInterviewBoardNodes, mergeInterviewNodes } from '../../layout/interviewLayout';
import { snapshotFromPayload } from '../protocol/subdocMerge';
import type { WhiteboardPayload } from '../protocol/subdocProtocol';
import {
  getInterviewSession,
  listInterviewSessions,
  reopenInterviewSession,
  type InterviewSummary,
} from '../sync/interviewApi';

function hasElements(canvas: unknown): canvas is WhiteboardPayload {
  return !!canvas && Array.isArray((canvas as WhiteboardPayload).elements) && (canvas as WhiteboardPayload).elements.length > 0;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function SessionsListBody() {
  const { resumeInterviewSession, setSessionIdentity, isCollaborating } = useCanvasCollab();
  const { enterCanvas } = useWorkspace();
  const { setNodes } = useReactFlow();
  const { ensureSignedIn } = useAuth();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [items, setItems] = useState<InterviewSummary[]>([]);
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
    await ensureSignedIn();
    setItems(await listInterviewSessions());
  }, [ensureSignedIn]);

  useEffect(() => {
    if (configured) void refresh();
  }, [configured, refresh]);

  const resume = useCallback(
    async (row: InterviewSummary) => {
      setBusy(true);
      try {
        let next = row;
        if (row.status === 'ended') {
          const re = await reopenInterviewSession(row.id);
          if (re) next = { ...row, status: 'active', roomCode: re.roomCode };
        }
        // Recover the guest token + saved board (list rows are sanitized summaries).
        const full = await getInterviewSession(next.id);
        enterCanvas();
        // Rebuild the interview board and seed the persisted whiteboard so the
        // reconnected room isn't empty when the old relay room has expired.
        const boardNodes = buildInterviewBoardNodes({ includeNotes: true });
        const savedBoard = full && hasElements(full.canvas) ? full.canvas : null;
        setNodes((prev) => {
          const merged = mergeInterviewNodes(prev as PanelFlowNode[], boardNodes);
          if (!savedBoard) return merged;
          // Seed whichever whiteboard node survives the merge (existing OR new),
          // so mergeInterviewNodes filtering the seeded node never loses the board.
          return merged.map((n) =>
            (n.data as { kind?: string })?.kind === 'whiteboard'
              ? { ...n, data: { ...n.data, subDoc: snapshotFromPayload(n.id, 'whiteboard', 1, savedBoard) } }
              : n,
          );
        });
        resumeInterviewSession(next);
        if (full?.guestToken) setSessionIdentity({ guestToken: full.guestToken });
      } finally {
        setBusy(false);
      }
    },
    [resumeInterviewSession, setSessionIdentity, enterCanvas, setNodes],
  );

  if (configured === null) {
    return (
      <div className="flex items-center gap-2 p-1 text-ink3">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className={chromeText.sm}>Loading…</span>
      </div>
    );
  }
  if (!configured) {
    return <p className={cn('p-1 text-ink3', chromeText.sm)}>Server not available — past interviews are unavailable here.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {items.length === 0 ? (
        <p className={cn('py-2 text-center text-ink3', chromeText.xs)}>No interviews yet. Start one from the Session panel.</p>
      ) : (
        items.map((s) => (
          <div key={s.id} className={cn('flex items-center gap-2 border border-edge bg-panel2 px-2 py-1.5', RADIUS_CTRL)}>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-ink', chromeText.sm)}>{s.title}</span>
              <span className={cn('block text-ink3', chromeText.xs)}>
                {s.status === 'ended' ? 'Ended' : 'Active'} · {relativeTime(s.updatedAt)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void resume(s)}
              disabled={busy || isCollaborating || !s.roomCode}
              title={s.roomCode ? undefined : 'No room bound to this session'}
              className={cn('inline-flex items-center gap-1 border border-edge px-1.5 py-1 text-ink2 hover:bg-panel disabled:opacity-40', RADIUS_CTRL, chromeText.xs)}
            >
              {s.status === 'ended' ? <RotateCcw className="h-3 w-3" /> : <LogIn className="h-3 w-3" />}
              {s.status === 'ended' ? 'Reopen' : 'Resume'}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export const SESSIONS_LIST_WIDGET: CanvasWidget = {
  id: 'interview-sessions',
  title: 'Past interviews',
  icon: <CalendarClock className="h-3 w-3" />,
  tab: 'more',
  order: 55,
  Body: SessionsListBody,
};
