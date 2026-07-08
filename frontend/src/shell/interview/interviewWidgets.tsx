import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Lock,
  Plus,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { buildInterviewInviteUrl, buildInviteUrl } from '@/store/navigation/shareState';
import { chromeText } from '@/shell/chromeUi';
import { RADIUS_CTRL, RADIUS_SHELL } from '@/shell/canvas/ui/nodeui';
import { useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';
import type { CanvasWidget } from '@/shell/canvas/widgets/types';
import {
  endInterviewSession,
  getInterviewSession,
  reopenInterviewSession,
  rotateInterviewToken,
  updateInterviewSession,
  type InterviewQuestion,
  type QuestionCategory,
  type Recommendation,
  type RubricCriterion,
  type UpdateInterviewPatch,
} from '@/platform/api/interviewApi';
import { useSendToBoard } from './useSendToBoard';
import { exportInterviewBoard } from './exportBoard';

const QUESTION_CATEGORIES: QuestionCategory[] = [
  'general',
  'technical',
  'behavioral',
  'system-design',
  'coding',
];

const DEFAULT_RUBRIC: Omit<RubricCriterion, 'id'>[] = [
  { label: 'Problem solving', score: 0, comment: '' },
  { label: 'Communication', score: 0, comment: '' },
  { label: 'Code quality', score: 0, comment: '' },
  { label: 'Technical depth', score: 0, comment: '' },
  { label: 'Culture add', score: 0, comment: '' },
];

const RECOMMENDATIONS: { value: Recommendation; label: string }[] = [
  { value: 'strong_hire', label: 'Strong hire' },
  { value: 'hire', label: 'Hire' },
  { value: 'lean_hire', label: 'Lean hire' },
  { value: 'no_hire', label: 'No hire' },
];

let nseq = 0;
const newId = () => `i${Date.now().toString(36)}${(nseq++).toString(36)}`;

const interviewGate = () => {
  const c = useCanvasCollab();
  return c.isCollaborating && c.isHost && c.session.kind === 'interview';
};

/* -------------------------------------------------- shared debounced patch */

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function usePatchSession(sessionId?: string) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<UpdateInterviewPatch>({});
  const flushRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState<SaveStatus>('idle');

  flushRef.current = () => {
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (!sessionId || Object.keys(patch).length === 0) return;
    setStatus('saving');
    void updateInterviewSession(sessionId, patch)
      .then((r) => setStatus(r ? 'saved' : 'error'))
      .catch(() => setStatus('error'));
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      flushRef.current();
    },
    [],
  );

  const patch = useCallback((p: UpdateInterviewPatch, debounceMs = 1000) => {
    pending.current = { ...pending.current, ...p };
    if (timer.current) clearTimeout(timer.current);
    if (debounceMs <= 0) flushRef.current();
    else timer.current = setTimeout(() => flushRef.current(), debounceMs);
  }, []);

  return { patch, status };
}

/** Tiny autosave state line: silent when idle/saved, explicit when in flight or failed. */
function SaveStatusChip({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span
      role="status"
      className={cn(
        'interview-save-status block',
        chromeText.xs,
        status === 'error' ? 'text-bad' : 'text-ink3',
      )}
    >
      {status === 'saving'
        ? 'Saving…'
        : status === 'saved'
          ? 'Saved'
          : 'Couldn’t save — retries on your next edit'}
    </span>
  );
}

/* ---------------------------------------------------------- room controls */

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="interview-toggle flex items-center justify-between gap-2 py-0.5">
      <span className="min-w-0">
        <span className={cn('block text-ink2', chromeText.sm)}>{label}</span>
        {hint ? <span className={cn('block text-ink3', chromeText.xs)}>{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors',
          'interview-toggle__switch',
          checked ? 'bg-accent' : 'bg-edge',
        )}
      >
        <span
          className={cn(
            'inline-block h-3 w-3 rounded-full bg-white transition-transform',
            'interview-toggle__thumb',
            checked ? 'translate-x-3.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

function RoomControlsBody() {
  const {
    session,
    room,
    isHost,
    setLocked,
    setHostFollow,
    setHostFrameFollow,
    setSessionIdentity,
  } = useCanvasCollab();
  const { mode, theme, palette, themePreset, dir } = useWorkspace();
  const { readBoard, canSend } = useSendToBoard();
  const sessionId = session.sessionId;
  const runtime = session.interviewRuntime;
  const { patch } = usePatchSession(sessionId);

  const [guestLinkEnabled, setGuestLinkEnabled] = useState(true);
  const [status, setStatus] = useState<'active' | 'ended'>('active');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const loadedId = useRef<string>();

  // Hydrate the toggle + lifecycle state from the durable session (esp. on resume).
  useEffect(() => {
    if (!sessionId || loadedId.current === sessionId) return;
    loadedId.current = sessionId;
    void getInterviewSession(sessionId).then((s) => {
      if (!s) return;
      setStatus(s.status);
      setGuestLinkEnabled(s.guestLinkEnabled);
    });
  }, [sessionId]);

  const shareBase = { focus: 'canvas' as const, mode, theme, palette, themePreset, dir };
  const inviteUrl = room
    ? session.guestToken
      ? buildInterviewInviteUrl(shareBase, room, session.guestToken)
      : buildInviteUrl({ ...shareBase, sessionKind: 'interview' }, room)
    : '';

  const copyInvite = async (url = inviteUrl) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const toggleLock = (v: boolean) => {
    setLocked(v);
    if (sessionId) patch({ canvasLocked: v }, 0);
  };

  const toggleLinkEnabled = (v: boolean) => {
    setGuestLinkEnabled(v);
    if (sessionId) patch({ guestLinkEnabled: v }, 0);
  };

  const rotate = async () => {
    if (!sessionId) return;
    setBusy(true);
    const next = await rotateInterviewToken(sessionId);
    setBusy(false);
    if (next) {
      setSessionIdentity({ guestToken: next.guestToken });
      if (room) await copyInvite(buildInterviewInviteUrl(shareBase, room, next.guestToken));
    }
  };

  const endOrReopen = async () => {
    if (!sessionId) return;
    setBusy(true);
    if (status === 'active') {
      const r = await endInterviewSession(sessionId);
      if (r) {
        setStatus('ended');
        setLocked(true);
      }
    } else {
      const r = await reopenInterviewSession(sessionId);
      if (r) {
        setStatus('active');
        setLocked(false);
      }
    }
    setBusy(false);
  };

  const doExport = async (fmt: 'svg' | 'json') => {
    const board = readBoard();
    if (!board) {
      setExportError('No whiteboard on the canvas to export.');
      return;
    }
    try {
      await exportInterviewBoard(board, 'interview-board', fmt);
      setExportError(null);
    } catch {
      setExportError('Export failed — try again.');
    }
  };

  if (!isHost) return null;

  return (
    <div className="interview-room-controls flex flex-col gap-3">
      {/* Guest link */}
      <div className="interview-room-controls__section flex flex-col gap-1.5">
        <span className={cn('interview-room-controls__label font-medium text-ink3', chromeText.xs)}>
          Guest invite
        </span>
        <div className="interview-room-controls__invite flex items-center gap-1.5">
          <input
            readOnly
            value={inviteUrl}
            className={cn(
              'min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1 text-ink3 outline-none',
              'interview-room-controls__input',
              RADIUS_CTRL,
              chromeText.xs,
            )}
          />
          <button
            type="button"
            onClick={() => copyInvite()}
            title="Copy invite link"
            aria-label="Copy invite link"
            className={cn(
              'grid h-7 w-7 shrink-0 place-items-center border border-edge bg-panel2 text-ink2 hover:text-ink',
              'interview-room-controls__copy',
              RADIUS_CTRL,
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-good" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {session.guestToken ? (
          <>
            <Toggle
              label="Guest link enabled"
              checked={guestLinkEnabled}
              onChange={toggleLinkEnabled}
            />
            <button
              type="button"
              onClick={rotate}
              disabled={busy}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 border border-edge bg-panel2 px-2 py-1 font-medium text-ink2 hover:text-ink disabled:opacity-40',
                RADIUS_CTRL,
                chromeText.sm,
              )}
            >
              <RefreshCw className="h-3 w-3" /> Rotate link
            </button>
          </>
        ) : null}
      </div>

      <span className="interview-room-controls__divider h-px bg-edge" />

      {/* Room controls */}
      <div className="interview-room-controls__section flex flex-col gap-1">
        <Toggle
          label={
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3" /> Lock board
            </span>
          }
          hint="Candidate becomes view-only"
          checked={!!runtime?.locked}
          onChange={toggleLock}
        />
        <Toggle
          label="Follow me"
          hint="Candidate's view tracks yours"
          checked={!!runtime?.hostFollow}
          onChange={setHostFollow}
        />
        <Toggle
          label="Sync playback"
          hint="Candidate's scrubber tracks yours on viz panels"
          checked={!!runtime?.hostFrameFollow}
          onChange={setHostFrameFollow}
        />
      </div>

      <span className="interview-room-controls__divider h-px bg-edge" />

      {/* Export + lifecycle */}
      <div className="interview-room-controls__exports flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void doExport('svg')}
          disabled={!canSend}
          title={canSend ? 'Download the whiteboard as SVG' : 'Requires a whiteboard on the canvas'}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1 border border-edge bg-panel2 px-2 py-1 font-medium text-ink2 hover:text-ink disabled:opacity-40',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        >
          <Download className="h-3 w-3" /> SVG
        </button>
        <button
          type="button"
          onClick={() => void doExport('json')}
          disabled={!canSend}
          title={
            canSend ? 'Download the whiteboard as JSON' : 'Requires a whiteboard on the canvas'
          }
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1 border border-edge bg-panel2 px-2 py-1 font-medium text-ink2 hover:text-ink disabled:opacity-40',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        >
          <Download className="h-3 w-3" /> JSON
        </button>
      </div>
      {exportError ? (
        <p role="alert" className={cn('interview-room-controls__error text-bad', chromeText.xs)}>
          {exportError}
        </p>
      ) : null}
      {sessionId ? (
        <button
          type="button"
          onClick={endOrReopen}
          disabled={busy}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 border px-2 py-1 font-medium disabled:opacity-40',
            RADIUS_CTRL,
            chromeText.sm,
            status === 'active'
              ? 'border-bad/40 bg-badbg text-bad hover:bg-bad/15'
              : 'border-edge bg-panel2 text-ink2 hover:text-ink',
          )}
        >
          {status === 'active' ? 'End interview' : 'Reopen interview'}
        </button>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- questions */

function QuestionsBody() {
  const { session } = useCanvasCollab();
  const { sendQuestion, canSend } = useSendToBoard();
  const sessionId = session.sessionId;
  const { patch, status } = usePatchSession(sessionId);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<QuestionCategory>('general');
  const [sendError, setSendError] = useState<string | null>(null);
  const sendErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedId = useRef<string>();

  useEffect(
    () => () => {
      if (sendErrorTimer.current) clearTimeout(sendErrorTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!sessionId || loadedId.current === sessionId) return;
    loadedId.current = sessionId;
    void getInterviewSession(sessionId).then((s) => {
      setQuestions(s?.questions ?? []);
    });
  }, [sessionId]);

  const save = (next: InterviewQuestion[], debounceMs = 800) => {
    setQuestions(next);
    patch({ questions: next }, debounceMs);
  };

  const add = () => {
    const t = text.trim();
    if (!t) return;
    save([...questions, { id: newId(), text: t, category, asked: false }], 0);
    setText('');
  };

  const send = (q: InterviewQuestion) => {
    if (!sendQuestion(q.text, q.category)) {
      setSendError('Couldn’t send — add a whiteboard panel to the canvas first.');
      if (sendErrorTimer.current) clearTimeout(sendErrorTimer.current);
      sendErrorTimer.current = setTimeout(() => setSendError(null), 4000);
      return;
    }
    setSendError(null);
    save(
      questions.map((it) => (it.id === q.id ? { ...it, asked: true } : it)),
      0,
    );
  };

  return (
    <div className="interview-questions flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a question to your bank…"
        rows={2}
        className={cn(
          'resize-none border border-edge bg-panel2 px-2 py-1.5 text-ink outline-none placeholder:text-ink3 focus:border-accent',
          'interview-questions__textarea',
          RADIUS_CTRL,
          chromeText.sm,
        )}
      />
      <div className="interview-questions__composer flex items-center gap-1.5">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as QuestionCategory)}
          className={cn(
            'min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1 text-ink2 outline-none focus:border-accent',
            'interview-questions__select',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        >
          {QUESTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          className={cn(
            'inline-flex items-center gap-1 bg-accent px-2.5 py-1 font-medium text-white disabled:opacity-40',
            'interview-questions__add',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {sendError ? (
        <p role="alert" className={cn('interview-questions__error text-bad', chromeText.xs)}>
          {sendError}
        </p>
      ) : null}
      <SaveStatusChip status={status} />
      {questions.length === 0 ? (
        <p className={cn('interview-questions__empty py-2 text-center text-ink3', chromeText.xs)}>
          Prepare questions here, then send them to the board one at a time. The candidate only sees
          what you send.
        </p>
      ) : (
        <ul className="interview-questions__list flex flex-col gap-1.5">
          {questions.map((q) => (
            <li
              key={q.id}
              className={cn(
                'flex flex-col gap-1.5 border p-2',
                'interview-question-card',
                RADIUS_SHELL,
                q.asked ? 'border-good/40 bg-goodbg/40' : 'border-edge bg-panel2/50',
              )}
            >
              <div className="interview-question-card__head flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'rounded border border-edge px-1 py-0.5 capitalize text-ink3',
                    'interview-question-card__category',
                    chromeText.xs,
                  )}
                >
                  {q.category}
                </span>
                <button
                  type="button"
                  onClick={() => save(questions.filter((it) => it.id !== q.id))}
                  aria-label="Delete question"
                  className={cn(
                    'grid h-6 w-6 place-items-center text-ink3 hover:bg-badbg hover:text-bad',
                    'interview-question-card__delete',
                    RADIUS_CTRL,
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <p
                className={cn(
                  'interview-question-card__text whitespace-pre-wrap break-words text-ink',
                  chromeText.sm,
                )}
              >
                {q.text}
              </p>
              <button
                type="button"
                onClick={() => send(q)}
                disabled={!canSend}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 border border-edge bg-panel2 py-1 font-medium text-ink2 hover:text-ink disabled:opacity-40',
                  'interview-question-card__send',
                  RADIUS_CTRL,
                  chromeText.sm,
                )}
              >
                <Send className="h-3 w-3" /> {q.asked ? 'Send again' : 'Send to board'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- notes */

function NotesBody() {
  const { session } = useCanvasCollab();
  const sessionId = session.sessionId;
  const { patch, status } = usePatchSession(sessionId);
  const [notes, setNotes] = useState('');
  const loadedId = useRef<string>();

  useEffect(() => {
    if (!sessionId || loadedId.current === sessionId) return;
    loadedId.current = sessionId;
    void getInterviewSession(sessionId).then((s) => {
      setNotes(s?.notes ?? '');
    });
  }, [sessionId]);

  return (
    <div className="interview-notes flex flex-col gap-1.5">
      <p className={cn('interview-notes__hint text-ink3', chromeText.xs)}>
        Private — never shown to the candidate. Saves automatically.
      </p>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          patch({ notes: e.target.value }, 1200);
        }}
        placeholder="Interview notes…"
        rows={6}
        className={cn(
          'resize-none border border-edge bg-panel2 px-2 py-1.5 text-ink outline-none placeholder:text-ink3 focus:border-accent',
          'interview-notes__textarea',
          RADIUS_CTRL,
          chromeText.sm,
        )}
      />
      <SaveStatusChip status={status} />
    </div>
  );
}

/* ------------------------------------------------------------------ rubric */

function RubricBody() {
  const { session } = useCanvasCollab();
  const sessionId = session.sessionId;
  const { patch, status } = usePatchSession(sessionId);
  const [rubric, setRubric] = useState<RubricCriterion[]>(() =>
    DEFAULT_RUBRIC.map((r) => ({ ...r, id: newId() })),
  );
  const [recommendation, setRecommendation] = useState<Recommendation>('');
  const [customLabel, setCustomLabel] = useState('');
  const loadedId = useRef<string>();

  useEffect(() => {
    if (!sessionId || loadedId.current === sessionId) return;
    loadedId.current = sessionId;
    void getInterviewSession(sessionId).then((s) => {
      setRubric(s?.rubric?.length ? s.rubric : DEFAULT_RUBRIC.map((r) => ({ ...r, id: newId() })));
      setRecommendation(s?.recommendation ?? '');
    });
  }, [sessionId]);

  const save = (next: RubricCriterion[], rec = recommendation) => {
    setRubric(next);
    patch({ rubric: next, recommendation: rec });
  };

  const addCriterion = () => {
    const l = customLabel.trim();
    if (!l) return;
    save([...rubric, { id: newId(), label: l, score: 0, comment: '' }]);
    setCustomLabel('');
  };

  return (
    <div className="interview-rubric flex flex-col gap-2">
      <p className={cn('interview-rubric__hint text-ink3', chromeText.xs)}>
        Private scorecard — saves automatically.
      </p>
      <SaveStatusChip status={status} />
      {rubric.map((c) => (
        <div
          key={c.id}
          className={cn(
            'interview-rubric-card flex flex-col gap-1.5 border border-edge bg-panel2/50 p-2',
            RADIUS_SHELL,
          )}
        >
          <div className="interview-rubric-card__head flex items-center justify-between gap-2">
            <span
              className={cn('interview-rubric-card__label font-medium text-ink', chromeText.sm)}
            >
              {c.label}
            </span>
            <span className="interview-rubric-card__stars flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  aria-label={`${c.label}: ${score} of 5`}
                  onClick={() =>
                    save(
                      rubric.map((it) =>
                        it.id === c.id ? { ...it, score: it.score === score ? 0 : score } : it,
                      ),
                    )
                  }
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      'interview-rubric-card__star',
                      c.score >= score ? 'fill-amber-400 text-amber-400' : 'text-ink3/40',
                    )}
                  />
                </button>
              ))}
            </span>
          </div>
          <input
            value={c.comment}
            onChange={(e) =>
              save(rubric.map((it) => (it.id === c.id ? { ...it, comment: e.target.value } : it)))
            }
            placeholder="Comment…"
            className={cn(
              'border border-edge bg-panel2 px-2 py-1 text-ink outline-none placeholder:text-ink3 focus:border-accent',
              'interview-rubric-card__comment',
              RADIUS_CTRL,
              chromeText.xs,
            )}
          />
        </div>
      ))}
      <div className="interview-rubric__add flex items-center gap-1.5">
        <input
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addCriterion();
          }}
          placeholder="Add criterion…"
          className={cn(
            'min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1 text-ink outline-none placeholder:text-ink3 focus:border-accent',
            'interview-rubric__input',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        />
        <button
          type="button"
          onClick={addCriterion}
          disabled={!customLabel.trim()}
          className={cn(
            'grid h-7 w-7 place-items-center border border-edge bg-panel2 text-ink2 hover:text-ink disabled:opacity-40',
            'interview-rubric__add-button',
            RADIUS_CTRL,
          )}
          aria-label="Add criterion"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <label className="interview-rubric__recommendation flex flex-col gap-1">
        <span className={cn('interview-rubric__recommendation-label text-ink3', chromeText.xs)}>
          Overall recommendation
        </span>
        <select
          value={recommendation}
          onChange={(e) => {
            const rec = e.target.value as Recommendation;
            setRecommendation(rec);
            patch({ rubric, recommendation: rec }, 0);
          }}
          className={cn(
            'border border-edge bg-panel2 px-2 py-1 text-ink2 outline-none focus:border-accent',
            'interview-rubric__select',
            RADIUS_CTRL,
            chromeText.sm,
          )}
        >
          <option value="">Select…</option>
          {RECOMMENDATIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export const INTERVIEW_WIDGETS: CanvasWidget[] = [
  {
    id: 'interview-room-controls',
    title: 'Room controls',
    icon: <SlidersHorizontal className="h-3 w-3" />,
    tab: 'collab',
    order: 21,
    useVisible: interviewGate,
    Body: RoomControlsBody,
  },
  {
    id: 'interview-questions',
    title: 'Questions',
    icon: <Send className="h-3 w-3" />,
    tab: 'collab',
    order: 26,
    useVisible: interviewGate,
    Body: QuestionsBody,
  },
  {
    id: 'interview-notes',
    title: 'Notes',
    icon: <SlidersHorizontal className="h-3 w-3" />,
    tab: 'collab',
    order: 27,
    useVisible: interviewGate,
    Body: NotesBody,
  },
  {
    id: 'interview-rubric',
    title: 'Rubric',
    icon: <Star className="h-3 w-3" />,
    tab: 'collab',
    order: 28,
    useVisible: interviewGate,
    Body: RubricBody,
  },
];
