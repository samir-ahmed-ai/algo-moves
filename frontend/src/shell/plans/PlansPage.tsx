import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/shell/auth/AuthProvider';
import { useWorkspace } from '@/store/workspace';
import { ProductAuthGate } from '@/shell/auth/ProductAuthGate';
import { chromeText } from '@/shell/chromeUi';
import {
  createPrepPlan,
  deletePrepPlan,
  listPrepPlans,
  type PrepPlanSummary,
} from './data/prepPlansApi';
import { usePlan } from './PlanContext';

// ─── Auth gate ────────────────────────────────────────────────────────────────

function SignInGate() {
  return (
    <ProductAuthGate
      variant="plans"
      icon={<BookMarked className="h-6 w-6" strokeWidth={1.5} />}
      eyebrow="Interview command center"
      title="Build a prep plan that actually ships."
      lede="Create named study plans, collect problems from any track, and move through the exact reps you need before the interview."
      features={[
        { icon: <BookMarked className="h-4 w-4" />, label: 'Named plans for each role' },
        { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Progress that survives sessions' },
        { icon: <ChevronRight className="h-4 w-4" />, label: 'One clear next problem' },
      ]}
      preview={
        <>
          <div className="product-auth-gate__preview-top">
            <span>FAANG sprint</span>
            <strong>72%</strong>
          </div>
          <div className="product-auth-gate__progress">
            <span style={{ width: '72%' }} />
          </div>
          <div className="product-auth-gate__mini-list">
            <span>Backtracking review</span>
            <span>Graph traversal refresh</span>
            <span>Mock interview warmup</span>
          </div>
        </>
      }
    />
  );
}

// ─── Create plan form ─────────────────────────────────────────────────────────

function CreatePlanForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async () => {
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    const plan = await createPrepPlan(t);
    setBusy(false);
    if (plan) {
      setTitle('');
      onCreated(plan.id);
    }
  }, [title, onCreated]);

  return (
    <div className="plan-create-form flex gap-2">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder='e.g. "Comcast interview"'
        className={cn(
          'plan-create-form__input flex-1 rounded-xl border border-edge bg-panel2 px-3 py-2 text-ink outline-none',
          'placeholder:text-ink3 focus:border-accent/60 focus:ring-2 focus:ring-accent/15',
          chromeText.base,
        )}
        maxLength={200}
        aria-label="Plan title"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!title.trim() || busy}
        className="plan-create-form__button inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Create
      </button>
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onOpen,
  onStart,
  onDelete,
}: {
  plan: PrepPlanSummary;
  onOpen: () => void;
  onStart: () => void;
  onDelete: () => void;
}) {
  const pct = plan.itemCount > 0 ? Math.round((plan.completedCount / plan.itemCount) * 100) : 0;
  const allDone = plan.itemCount > 0 && plan.completedCount === plan.itemCount;

  return (
    <div className="plan-card group relative flex flex-col gap-3 rounded-xl border border-edge bg-panel p-4 transition hover:border-accent/40 hover:bg-panel2">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'plan-card__status mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
            allDone ? 'border-good/40 text-good' : 'border-edge text-ink3',
          )}
        >
          {allDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{plan.title}</p>
          <p className={cn('text-ink3', chromeText.sm)}>
            {plan.itemCount === 0
              ? 'No problems yet'
              : `${plan.completedCount} / ${plan.itemCount} problems`}
          </p>
        </div>
        <button
          type="button"
          title="Delete plan"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="plan-card__delete shrink-0 rounded-lg p-1.5 text-ink3 opacity-0 transition hover:bg-panel2 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      {plan.itemCount > 0 && (
        <div className="plan-card__progress h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className={cn(
              'plan-card__progress-fill h-full rounded-full transition-all',
              allDone ? 'is-complete bg-good' : 'bg-accent',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="plan-card__actions flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            'plan-card__secondary flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-edge py-2 text-sm font-medium text-ink3',
            'transition hover:border-accent/50 hover:bg-panel2 hover:text-ink',
          )}
        >
          Edit plan
        </button>
        <button
          type="button"
          onClick={onStart}
          disabled={plan.itemCount === 0}
          className={cn(
            'plan-card__primary flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2 text-sm font-semibold text-white shadow-sm',
            'transition hover:opacity-90 disabled:opacity-40',
          )}
        >
          Start
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Plans hub ────────────────────────────────────────────────────────────────

export function PlansPage() {
  const { configured, isAnonymous, loading } = useAuth();
  const { goHome, enterWorkspace, openProblem } = useWorkspace();
  const plan = usePlan();

  const [plans, setPlans] = useState<PrepPlanSummary[]>([]);
  const [fetching, setFetching] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const needsAuth = !configured || isAnonymous;

  const fetchPlans = useCallback(async () => {
    setFetching(true);
    const list = await listPrepPlans();
    setPlans(list);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!loading && !needsAuth) {
      fetchPlans();
    }
  }, [loading, needsAuth, fetchPlans]);

  const handleCreated = useCallback(
    async (planId: string) => {
      await plan.loadPlan(planId);
      // Navigate to workspace so they can start browsing and adding problems.
      enterWorkspace();
    },
    [plan, enterWorkspace],
  );

  const handleOpen = useCallback(
    async (planId: string) => {
      await plan.loadPlan(planId);
      enterWorkspace();
    },
    [plan, enterWorkspace],
  );

  const handleStart = useCallback(
    async (planId: string) => {
      const loaded = await plan.loadPlan(planId);
      // If the plan already has items, start the run from the first one.
      if (loaded && loaded.items.length > 0) {
        plan.startRun(0);
        openProblem(loaded.items[0].itemId);
      } else {
        enterWorkspace();
      }
    },
    [plan, openProblem, enterWorkspace],
  );

  const handleDelete = useCallback(async (planId: string) => {
    await deletePrepPlan(planId);
    setDeleteConfirm(null);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  }, []);

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-edge px-4">
        <button
          type="button"
          onClick={goHome}
          className="grid h-8 w-8 place-items-center rounded-xl border border-edge text-ink3 transition hover:bg-panel2 hover:text-ink"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-accent" />
          <span className="font-semibold text-ink">Interview Prep Plans</span>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 flex-col overflow-auto">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink3" />
          </div>
        ) : needsAuth ? (
          <SignInGate />
        ) : (
          <div className="product-hub-shell mx-auto w-full max-w-2xl px-4 py-8">
            {/* Create */}
            <section className="product-hub-card mb-8">
              <div className="product-hub-card__head">
                <div>
                  <span className="product-hub-card__eyebrow">prep queue</span>
                  <h2>New plan</h2>
                </div>
                <Plus className="h-4 w-4 text-accent" />
              </div>
              <CreatePlanForm onCreated={handleCreated} />
              <p className={cn('mt-2 text-ink3', chromeText.sm)}>
                Give your plan a name, then browse tracks to add problems.
              </p>
            </section>

            {/* Existing plans */}
            <section className="product-hub-card">
              <div className="product-hub-card__head mb-3">
                <div>
                  <span className="product-hub-card__eyebrow">active plans</span>
                  <h2>Your plans</h2>
                </div>
                {fetching && <Loader2 className="h-4 w-4 animate-spin text-ink3" />}
              </div>

              {!fetching && plans.length === 0 ? (
                <div className="product-empty-state">
                  <div className="product-empty-state__icon">
                    <BookMarked className="h-7 w-7" />
                  </div>
                  <h3>No plans yet</h3>
                  <p className={chromeText.base}>
                    Create your first plan, then add problems from any track to build a focused prep
                    queue.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {plans.map((p) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      onOpen={() => handleOpen(p.id)}
                      onStart={() => handleStart(p.id)}
                      onDelete={() => setDeleteConfirm(p.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Delete confirmation overlay */}
      {deleteConfirm && (
        <div
          className="product-confirm-backdrop fixed inset-0 z-50 flex items-center justify-center bg-bg/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="product-confirm-modal w-full max-w-sm rounded-2xl border border-edge bg-panel p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="product-confirm-modal__icon">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="mb-1 font-semibold text-ink">Delete plan?</h3>
            <p className={cn('mb-5 text-ink3', chromeText.sm)}>
              This will permanently delete the plan and all its saved problems.
            </p>
            <div className="product-confirm-modal__actions flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="product-confirm-modal__cancel rounded-xl border border-edge px-4 py-2 text-sm font-medium text-ink3 transition hover:bg-panel2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="product-confirm-modal__danger rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
