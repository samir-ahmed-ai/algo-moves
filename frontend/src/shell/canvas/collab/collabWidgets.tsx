import { useEffect, useRef, useState } from 'react';
import {
  Users,
  Radio,
  MessageSquare,
  MessageCircle,
  StickyNote,
  Crown,
  Copy,
  Check,
  Eye,
  Send,
  Trash2,
  LogOut,
  ClipboardList,
  UserCheck,
  Link2,
  LayoutTemplate,
  Settings2,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils/cn';
import { catalog } from '@/content';
import { useWorkspace } from '@/store/workspace';
import { buildInviteUrl } from '@/store/navigation/shareState';
import { chromeText } from '../../chromeUi';
import { Chip, RADIUS_CTRL, RADIUS_SHELL } from '../nodeui';
import { useRoomComms } from '../../games/net/useRoomComms';
import { useCanvasCollab } from './CanvasCollabProvider';
import { buildInterviewBoardNodes, mergeInterviewNodes } from '../interviewLayout';
import type { PanelFlowNode } from '@/shell/panels/panelTypes';
import type { CanvasWidget } from '../widgets/types';

const QUICK_REACTIONS = ['👍', '🔥', '😂', '🎉', '👏', '🧠'];

/* ---------------------------------------------------------------- session */

export function SessionBody() {
  const collab = useCanvasCollab();
  const { activeItemId, mode, theme, palette, themePreset, dir, enterCanvas } = useWorkspace();
  const { setNodes } = useReactFlow();
  const {
    isCollaborating,
    startSession,
    startInterviewSession,
    joinSession,
    leaveSession,
    room,
    self,
    players,
    peers,
    followId,
    setFollowId,
    session,
  } = collab;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [interviewBusy, setInterviewBusy] = useState(false);
  const [boardBusy, setBoardBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const activeItem = catalog.getItem(activeItemId);
  const canInterview = !!activeItem?.pluginId;

  const isInterview = session.kind === 'interview';
  const shareBase = {
    item: isInterview ? activeItemId : undefined,
    focus: (isInterview && activeItemId ? 'problem' : 'canvas') as 'problem' | 'canvas',
    mode,
    theme,
    palette,
    themePreset,
    dir,
    sessionKind: (isInterview ? 'interview' : 'collab') as 'interview' | 'collab',
  };

  const start = async () => {
    setBusy(true);
    try {
      await startSession();
    } finally {
      setBusy(false);
    }
  };

  const startInterview = async () => {
    if (!canInterview) return;
    setInterviewBusy(true);
    try {
      await startInterviewSession(activeItemId);
    } finally {
      setInterviewBusy(false);
    }
  };

  const startInterviewBoard = async () => {
    setBoardBusy(true);
    try {
      enterCanvas();
      if (canInterview) {
        await startInterviewSession(activeItemId);
      } else {
        await startSession();
      }
      const newNodes = buildInterviewBoardNodes({
        includeNotes: canInterview,
        includeProblem: canInterview,
        problemId: canInterview ? activeItemId : undefined,
      });
      setNodes((prev) => mergeInterviewNodes(prev as PanelFlowNode[], newNodes));
    } finally {
      setBoardBusy(false);
    }
  };

  const join = () => {
    const c = code.trim();
    if (c) joinSession(c);
  };

  const copy = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; code is still visible */
    }
  };

  const copyInvite = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(buildInviteUrl(shareBase, room));
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  if (!isCollaborating) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 bg-accent px-2.5 py-1.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        >
          <Radio className="h-3 w-3" />
          Start collaborating
        </button>
        <button
          type="button"
          onClick={startInterview}
          disabled={interviewBusy || !canInterview}
          title={canInterview ? undefined : 'Open a problem first'}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 border border-edge bg-panel2 px-2.5 py-1.5 font-medium text-ink2 transition-colors hover:border-accent hover:text-accent disabled:opacity-40',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        >
          <UserCheck className="h-3 w-3" />
          Start interview
        </button>
        <button
          type="button"
          onClick={startInterviewBoard}
          disabled={boardBusy}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 border border-accent/40 bg-accent/10 px-2.5 py-1.5 font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-40',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        >
          <LayoutTemplate className="h-3 w-3" />
          Start interview board
        </button>
        <p className={cn('text-ink3', chromeText.xs)}>
          Spawns whiteboard + collab code studio{canInterview ? ` for “${activeItem?.title ?? activeItemId}”.` : '.'}
        </p>
        <div className="flex items-center gap-1.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 12))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') join();
            }}
            placeholder="Join code"
            className={cn(
              'min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1.5 text-ink outline-none transition-colors placeholder:text-ink3 focus:border-accent',
              RADIUS_CTRL,
              chromeText.sm,
            )}
          />
          <button
            type="button"
            onClick={join}
            disabled={!code.trim()}
            className={cn(
              'shrink-0 bg-panel2 px-2.5 py-1.5 font-medium text-ink2 transition-colors hover:text-ink disabled:opacity-40',
              RADIUS_CTRL,
              chromeText.sm,
            )}
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  const live = 1 + players.length + peers.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span
          dir="ltr"
          className={cn('flex-1 font-mono font-bold tracking-[0.2em] text-accent', chromeText.base)}
        >
          {room}
        </span>
        <button
          type="button"
          onClick={copy}
          title="Copy code"
          aria-label="Copy code"
          className={cn('grid h-6 w-6 place-items-center text-ink3 transition-colors hover:text-ink', RADIUS_CTRL)}
        >
          {copied ? <Check className="h-3 w-3 text-good" /> : <Copy className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={leaveSession}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 font-medium text-bad transition-colors hover:bg-badbg',
            RADIUS_CTRL,
            chromeText.xs,
          )}
        >
          <LogOut className="h-3 w-3" />
          Leave
        </button>
        <button
          type="button"
          onClick={copyInvite}
          title="Copy invite link"
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 font-medium text-ink2 transition-colors hover:bg-panel2 hover:text-ink',
            RADIUS_CTRL,
            chromeText.xs,
          )}
        >
          {inviteCopied ? <Check className="h-3 w-3 text-good" /> : <Link2 className="h-3 w-3" />}
          Invite link
        </button>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 font-medium text-ink2 transition-colors hover:bg-panel2 hover:text-ink',
            RADIUS_CTRL,
            chromeText.xs,
          )}
        >
          QR
        </button>
      </div>

      {showQr && room ? (
        <div className={cn('flex flex-col items-center gap-2 border border-edge bg-panel2 p-3', RADIUS_SHELL)}>
          <QRCodeSVG value={buildInviteUrl(shareBase, room)} size={128} bgColor="transparent" fgColor="currentColor" className="text-ink" />
          <span className={cn('text-center text-ink3', chromeText.xs)}>Scan to join the session</span>
        </div>
      ) : null}

      <div className="flex items-center gap-1.5 text-ink3">
        <Eye className="h-3 w-3" />
        <span className={chromeText.xs}>{live} live</span>
      </div>

      {session.kind === 'interview' && session.activeProblemId ? (
        <Chip tone="accent" mono className={cn('!px-2 !py-0.5', chromeText.xs)}>
          Interview · {catalog.getItem(session.activeProblemId)?.title ?? session.activeProblemId}
        </Chip>
      ) : null}

      <ul className="flex flex-col gap-0.5">
        {self ? <RosterRow name={self.name} role={self.role} isSelf /> : null}
        {players.map((p) => (
          <RosterRow key={p.id} name={p.name} role={p.role} />
        ))}
        {peers.map((peer) => (
          <RosterRow
            key={peer.id}
            name={peer.name}
            color={peer.color}
            following={peer.id === followId}
            onFollow={() => setFollowId(peer.id === followId ? null : peer.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function RosterRow({
  name,
  role,
  color,
  isSelf,
  following,
  onFollow,
}: {
  name: string;
  role?: string;
  color?: string;
  isSelf?: boolean;
  following?: boolean;
  onFollow?: () => void;
}) {
  return (
    <li className={cn('flex items-center gap-1.5 px-1 py-1', chromeText.sm)}>
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color ?? 'var(--accent)' }}
        aria-hidden
      />
      {role === 'host' ? <Crown className="h-3 w-3 shrink-0 text-amber-500" aria-label="Host" /> : null}
      <span className="min-w-0 flex-1 truncate text-ink">{name}</span>
      {isSelf ? <span className={cn('shrink-0 text-ink3', chromeText.xs)}>(you)</span> : null}
      {onFollow ? (
        <button
          type="button"
          onClick={onFollow}
          className={cn(
            'shrink-0 px-1.5 py-0.5 font-medium transition-colors',
            RADIUS_CTRL,
            chromeText.xs,
            following ? 'bg-accentbg text-accent' : 'text-ink3 hover:bg-panel2 hover:text-ink',
          )}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      ) : null}
    </li>
  );
}

/* -------------------------------------------------------- interview settings */

function SettingsToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5">
      <span className={cn('text-ink2', chromeText.sm)}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-edge',
        )}
      >
        <span
          className={cn(
            'inline-block h-3 w-3 rounded-full bg-white transition-transform',
            checked ? 'translate-x-3.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

function InterviewSettingsBody() {
  const { session, updateInterviewSettings, isHost } = useCanvasCollab();
  if (!isHost || session.kind !== 'interview' || !session.interview) return null;
  const s = session.interview;

  return (
    <div className="flex flex-col gap-1">
      <SettingsToggle
        label="Guest can draw on whiteboard"
        checked={s.guestCanEditBoard !== false}
        onChange={(v) => updateInterviewSettings({ guestCanEditBoard: v })}
      />
      <SettingsToggle
        label="Guest can edit code"
        checked={s.guestCanEditCode !== false}
        onChange={(v) => updateInterviewSettings({ guestCanEditCode: v })}
      />
      <SettingsToggle
        label="Guest can move nodes"
        checked={s.guestCanMoveNodes === true}
        onChange={(v) => updateInterviewSettings({ guestCanMoveNodes: v })}
      />
      <span className="my-0.5 h-px bg-edge" />
      <SettingsToggle
        label="Hide hints from candidate"
        checked={s.hideHints}
        onChange={(v) => updateInterviewSettings({ hideHints: v })}
      />
      <SettingsToggle
        label="Hide solutions from candidate"
        checked={s.hideSolutions}
        onChange={(v) => updateInterviewSettings({ hideSolutions: v })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------- chat */

function ChatBody() {
  const { self } = useCanvasCollab();
  const { messages, sendChat, sendReaction } = useRoomComms();
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    sendChat(text);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-0.5">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => sendReaction(emoji)}
            className="grid h-6 w-6 place-items-center rounded-full text-sm transition-transform hover:scale-125 active:scale-95"
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div ref={logRef} className="max-h-48 min-h-[3rem] overflow-y-auto" aria-live="polite">
        {messages.length === 0 ? (
          <p className={cn('py-2 text-center text-ink3', chromeText.xs)}>No messages yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {messages.map((m) => (
              <li key={m.id} className={cn('leading-snug', chromeText.sm)}>
                <span className={cn('font-semibold', m.fromId === self?.id ? 'text-accent' : 'text-ink2')}>
                  {m.name}:
                </span>{' '}
                <span className="break-words text-ink">{m.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 240))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="Message…"
          className={cn(
            'min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1.5 text-ink outline-none transition-colors placeholder:text-ink3 focus:border-accent',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim()}
          className={cn('grid h-8 w-8 shrink-0 place-items-center bg-accent text-white disabled:opacity-40', RADIUS_CTRL)}
          aria-label="Send"
        >
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- comments */

function CommentsBody() {
  const { comments, resolveComment, removeComment } = useCanvasCollab();
  const { setCenter } = useReactFlow();

  if (comments.length === 0) {
    return <p className={cn('py-2 text-center text-ink3', chromeText.xs)}>No comments yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {comments.map((c) => (
        <li
          key={c.id}
          className={cn(
            'flex flex-col gap-1 border border-edge bg-panel2/50 p-2',
            RADIUS_SHELL,
            c.resolved && 'opacity-60',
          )}
        >
          <button
            type="button"
            onClick={() => setCenter(c.x, c.y, { zoom: 1, duration: 400 })}
            className="flex flex-col gap-0.5 text-left"
          >
            <span className={cn('font-semibold text-ink2', chromeText.xs)}>{c.authorName}</span>
            <span className={cn('break-words text-ink', chromeText.sm)}>{c.text}</span>
          </button>
          <div className="flex items-center gap-2">
            {c.replies.length > 0 ? (
              <span className={cn('inline-flex items-center gap-1 text-ink3', chromeText.xs)}>
                <MessageCircle className="h-3 w-3" />
                {c.replies.length}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => resolveComment(c.id, !c.resolved)}
              className={cn(
                'ms-auto inline-flex items-center gap-1 px-1.5 py-0.5 font-medium transition-colors',
                RADIUS_CTRL,
                chromeText.xs,
                c.resolved ? 'text-ink3 hover:bg-panel2 hover:text-ink' : 'text-good hover:bg-goodbg',
              )}
            >
              <Check className="h-3 w-3" />
              {c.resolved ? 'Reopen' : 'Resolve'}
            </button>
            <button
              type="button"
              onClick={() => removeComment(c.id)}
              title="Delete"
              aria-label="Delete comment"
              className={cn('grid h-6 w-6 place-items-center text-ink3 transition-colors hover:bg-badbg hover:text-bad', RADIUS_CTRL)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- quiz log */

function QuizLogBody() {
  const { hostQuizLog } = useCanvasCollab();

  if (hostQuizLog.length === 0) {
    return <p className={cn('py-2 text-center text-ink3', chromeText.xs)}>No answers yet.</p>;
  }

  return (
    <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
      {[...hostQuizLog].reverse().map((entry, i) => (
        <li
          key={`${entry.at}-${entry.peerId}-${entry.questionId}-${i}`}
          className={cn('border border-edge bg-panel2/50 px-2 py-1.5', RADIUS_SHELL)}
        >
          <div className={cn('flex items-center justify-between gap-2', chromeText.xs)}>
            <span className="truncate font-semibold text-ink2">{entry.peerName}</span>
            <span className={entry.correct ? 'text-good' : 'text-bad'}>{entry.correct ? 'Correct' : 'Wrong'}</span>
          </div>
          <div className={cn('mt-0.5 truncate text-ink', chromeText.sm)}>{entry.answer}</div>
          <div className={cn('mt-0.5 text-ink3', chromeText.xs)}>{entry.questionId}</div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- badges */

function CommentsBadge() {
  const { comments } = useCanvasCollab();
  const count = comments.filter((c) => !c.resolved).length;
  if (count === 0) return null;
  return <>{count}</>;
}

export const COLLAB_WIDGETS: CanvasWidget[] = [
  {
    id: 'collab-session',
    title: 'Session',
    icon: <Users className="h-3 w-3" />,
    tab: 'collab',
    order: 10,
    defaultOpen: true,
    Body: SessionBody,
  },
  {
    id: 'collab-chat',
    title: 'Chat',
    icon: <MessageSquare className="h-3 w-3" />,
    tab: 'collab',
    order: 20,
    defaultOpen: true,
    useVisible: () => useCanvasCollab().isCollaborating,
    Body: ChatBody,
  },
  {
    id: 'collab-interview-settings',
    title: 'Interview settings',
    icon: <Settings2 className="h-3 w-3" />,
    tab: 'collab',
    order: 22,
    useVisible: () => {
      const c = useCanvasCollab();
      return c.isCollaborating && c.isHost && c.session.kind === 'interview';
    },
    Body: InterviewSettingsBody,
  },
  {
    id: 'collab-quiz-log',
    title: 'Quiz log',
    icon: <ClipboardList className="h-3 w-3" />,
    tab: 'collab',
    order: 25,
    useVisible: () => {
      const c = useCanvasCollab();
      return c.isCollaborating && c.isHost && c.session.kind === 'interview';
    },
    Body: QuizLogBody,
  },
  {
    id: 'collab-comments',
    title: 'Comments',
    icon: <StickyNote className="h-3 w-3" />,
    tab: 'collab',
    order: 30,
    useVisible: () => useCanvasCollab().isCollaborating,
    Badge: CommentsBadge,
    Body: CommentsBody,
  },
];
