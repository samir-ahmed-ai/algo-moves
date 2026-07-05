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
import { chromeText } from '../../../chromeUi';
import { RADIUS_CTRL, RADIUS_SHELL } from '../../ui/nodeui';
import { useCanvasCollab } from '../CanvasCollabProvider';
import type { CanvasWidget } from '../../widgets/types';
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
} from '../sync/interviewApi';
import { useSendToBoard } from './useSendToBoard';
import { exportInterviewBoard } from './exportBoard';

const QUESTION_CATEGORIES: QuestionCategory[] = ['general', 'technical', 'behavioral', 'system-design', 'coding'];

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

function usePatchSession(sessionId?: string) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<UpdateInterviewPatch>({});
  const flushRef = useRef<() => void>(() => {});

  flushRef.current = () => {
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (!sessionId || Object.keys(patch).length === 0) return;
    void updateInterviewSession(sessionId, patch);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      flushRef.current();
    },
    [],
  );

  return useCallback((patch: UpdateInterviewPatch, debounceMs = 1000) => {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    if (debounceMs <= 0) flushRef.current();
    else timer.current = setTimeout(() => flushRef.current(), debounceMs);
  }, []);
}

/* ---------------------------------------------------------- room controls */

function Toggle({ label, hint, checked, onChange }: { label: React.ReactNode; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="min-w-0">
        <span className={cn('block text-ink2', chromeText.sm)}>{label}</span>
        {hint ? <span className={cn('block text-ink3', chromeText.xs)}>{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-accent' : 'bg-edge')}
      >
        <span className={cn('inline-block h-3 w-3 rounded-full bg-white transition-transform', checked ? 'translate-x-3.5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

function RoomControlsBody() {
  const { session, room, isHost, setLocked, setHostFollow, setSessionIdentity } = useCanvasCollab();
  const { mode, theme, palette, themePreset, dir } = useWorkspace();
  const { readBoard, canSend } = useSendToBoard();
  const sessionId = session.sessionId;
  const runtime = session.interviewRuntime;
  const patch = usePatchSession(sessionId);

  const [guestLinkEnabled, setGuestLinkEnabled] = useState(true);
  const [status, setStatus] = useState<'active' | 'ended'>('active');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const doExport = (fmt: 'svg' | 'json') => {
    const board = readBoard();
    if (!board) return;
    void exportInterviewBoard(board, 'interview-board', fmt);
  };

  if (!isHost) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Guest link */}
      <div className="flex flex-col gap-1.5">
        <span className={cn('font-medium text-ink3', chromeText.xs)}>Guest invite</span>
        <div className="flex items-center gap-1.5">
          <input
            readOnly
            value={inviteUrl}
            className={cn('min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1 text-ink3 outline-none', RADIUS_CTRL, chromeText.xs)}
          />
          <button
            type="button"
            onClick={() => copyInvite()}
            title="Copy invite link"
            aria-label="Copy invite link"
            className={cn('grid h-7 w-7 shrink-0 place-items-center border border-edge bg-panel2 text-ink2 hover:text-ink', RADIUS_CTRL)}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        {session.guestToken ? (
          <>
            <Toggle label="Guest link enabled" checked={guestLinkEnabled} onChange={toggleLinkEnabled} />
            <button
              type="button"
              onClick={rotate}
              disabled={busy}
              className={cn('inline-flex items-center justify-center gap-1.5 border border-edge bg-panel2 px-2 py-1 font-medium text-ink2 hover:text-ink disabled:opacity-40', RADIUS_CTRL, chromeText.sm)}
            >
              <RefreshCw className="h-3 w-3" /> Rotate link
            </button>
          </>
        ) : null}
      </div>

      <span className="h-px bg-edge" />

      {/* Room controls */}
      <div className="flex flex-col gap-1">
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
        <Toggle label="Follow me" hint="Candidate's view tracks yours" checked={!!runtime?.hostFollow} onChange={setHostFollow} />
      </div>

      <span className="h-px bg-edge" />

      {/* Export + lifecycle */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => doExport('svg')}
          disabled={!canSend}
          className={cn('inline-flex flex-1 items-center justify-center gap-1 border border-edge bg-panel2 px-2 py-1 font-medium text-ink2 hover:text-ink disabled:opacity-40', RADIUS_CTRL, chromeText.sm)}
        >
          <Download className="h-3 w-3" /> SVG
        </button>
        <button
          type="button"
          onClick={() => doExport('json')}
          disabled={!canSend}
          className={cn('inline-flex flex-1 items-center justify-center gap-1 border border-edge bg-panel2 px-2 py-1 font-medium text-ink2 hover:text-ink disabled:opacity-40', RADIUS_CTRL, chromeText.sm)}
        >
          <Download className="h-3 w-3" /> JSON
        </button>
      </div>
      {sessionId ? (
        <button
          type="button"
          onClick={endOrReopen}
          disabled={busy}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 border px-2 py-1 font-medium disabled:opacity-40',
            RADIUS_CTRL,
            chromeText.sm,
            status === 'active' ? 'border-bad/40 bg-badbg text-bad hover:bg-bad/15' : 'border-edge bg-panel2 text-ink2 hover:text-ink',
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
  const patch = usePatchSession(sessionId);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<QuestionCategory>('general');
  const loadedId = useRef<string>();

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
    if (!sendQuestion(q.text, q.category)) return;
    save(questions.map((it) => (it.id === q.id ? { ...it, asked: true } : it)), 0);
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a question to your bank…"
        rows={2}
        className={cn('resize-none border border-edge bg-panel2 px-2 py-1.5 text-ink outline-none placeholder:text-ink3 focus:border-accent', RADIUS_CTRL, chromeText.sm)}
      />
      <div className="flex items-center gap-1.5">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as QuestionCategory)}
          className={cn('min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1 text-ink2 outline-none focus:border-accent', RADIUS_CTRL, chromeText.sm)}
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
          className={cn('inline-flex items-center gap-1 bg-accent px-2.5 py-1 font-medium text-white disabled:opacity-40', RADIUS_CTRL, chromeText.sm)}
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {questions.length === 0 ? (
        <p className={cn('py-2 text-center text-ink3', chromeText.xs)}>
          Prepare questions here, then send them to the board one at a time. The candidate only sees what you send.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {questions.map((q) => (
            <li
              key={q.id}
              className={cn('flex flex-col gap-1.5 border p-2', RADIUS_SHELL, q.asked ? 'border-good/40 bg-goodbg/40' : 'border-edge bg-panel2/50')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn('rounded border border-edge px-1 py-0.5 capitalize text-ink3', chromeText.xs)}>{q.category}</span>
                <button
                  type="button"
                  onClick={() => save(questions.filter((it) => it.id !== q.id))}
                  aria-label="Delete question"
                  className={cn('grid h-6 w-6 place-items-center text-ink3 hover:bg-badbg hover:text-bad', RADIUS_CTRL)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <p className={cn('whitespace-pre-wrap break-words text-ink', chromeText.sm)}>{q.text}</p>
              <button
                type="button"
                onClick={() => send(q)}
                disabled={!canSend}
                className={cn('inline-flex items-center justify-center gap-1.5 border border-edge bg-panel2 py-1 font-medium text-ink2 hover:text-ink disabled:opacity-40', RADIUS_CTRL, chromeText.sm)}
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
  const patch = usePatchSession(sessionId);
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
    <div className="flex flex-col gap-1.5">
      <p className={cn('text-ink3', chromeText.xs)}>Private — never shown to the candidate. Saves automatically.</p>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          patch({ notes: e.target.value }, 1200);
        }}
        placeholder="Interview notes…"
        rows={6}
        className={cn('resize-none border border-edge bg-panel2 px-2 py-1.5 text-ink outline-none placeholder:text-ink3 focus:border-accent', RADIUS_CTRL, chromeText.sm)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ rubric */

function RubricBody() {
  const { session } = useCanvasCollab();
  const sessionId = session.sessionId;
  const patch = usePatchSession(sessionId);
  const [rubric, setRubric] = useState<RubricCriterion[]>(() => DEFAULT_RUBRIC.map((r) => ({ ...r, id: newId() })));
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
    <div className="flex flex-col gap-2">
      <p className={cn('text-ink3', chromeText.xs)}>Private scorecard — saves automatically.</p>
      {rubric.map((c) => (
        <div key={c.id} className={cn('flex flex-col gap-1.5 border border-edge bg-panel2/50 p-2', RADIUS_SHELL)}>
          <div className="flex items-center justify-between gap-2">
            <span className={cn('font-medium text-ink', chromeText.sm)}>{c.label}</span>
            <span className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  aria-label={`${c.label}: ${score} of 5`}
                  onClick={() => save(rubric.map((it) => (it.id === c.id ? { ...it, score: it.score === score ? 0 : score } : it)))}
                >
                  <Star className={cn('h-4 w-4', c.score >= score ? 'fill-amber-400 text-amber-400' : 'text-ink3/40')} />
                </button>
              ))}
            </span>
          </div>
          <input
            value={c.comment}
            onChange={(e) => save(rubric.map((it) => (it.id === c.id ? { ...it, comment: e.target.value } : it)))}
            placeholder="Comment…"
            className={cn('border border-edge bg-panel2 px-2 py-1 text-ink outline-none placeholder:text-ink3 focus:border-accent', RADIUS_CTRL, chromeText.xs)}
          />
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <input
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addCriterion();
          }}
          placeholder="Add criterion…"
          className={cn('min-w-0 flex-1 border border-edge bg-panel2 px-2 py-1 text-ink outline-none placeholder:text-ink3 focus:border-accent', RADIUS_CTRL, chromeText.sm)}
        />
        <button
          type="button"
          onClick={addCriterion}
          disabled={!customLabel.trim()}
          className={cn('grid h-7 w-7 place-items-center border border-edge bg-panel2 text-ink2 hover:text-ink disabled:opacity-40', RADIUS_CTRL)}
          aria-label="Add criterion"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <label className="flex flex-col gap-1">
        <span className={cn('text-ink3', chromeText.xs)}>Overall recommendation</span>
        <select
          value={recommendation}
          onChange={(e) => {
            const rec = e.target.value as Recommendation;
            setRecommendation(rec);
            patch({ rubric, recommendation: rec }, 0);
          }}
          className={cn('border border-edge bg-panel2 px-2 py-1 text-ink2 outline-none focus:border-accent', RADIUS_CTRL, chromeText.sm)}
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
