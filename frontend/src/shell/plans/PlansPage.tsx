import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/shell/auth/AuthProvider';
import { useWorkspace } from '@/store/workspace';
import { ProductAuthGate } from '@/shell/auth/ProductAuthGate';
import { PageHeader } from '@/shell/chrome/PageHeader';
import { chromeText } from '@/shell/chromeUi';
import {
  createPrepPlan,
  deletePrepPlan,
  listPrepPlans,
  type PrepPlanSummary,
} from './data/prepPlansApi';
import { usePlan } from './PlanContext';
import { PlanProblemsTable } from './PlanProblemsTable';

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
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
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
        onClick={() => void submit()}
        disabled={!title.trim() || busy}
        className="plan-create-form__button inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition hover:opacity-90 disabled:opacity-50"
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
  onView,
  onBrowse,
  onStart,
  onDelete,
}: {
  plan: PrepPlanSummary;
  onView: () => void;
  onBrowse: () => void;
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
          className="plan-card__delete shrink-0 rounded-lg p-1.5 text-ink3 opacity-0 transition hover:bg-panel2 hover:text-bad group-hover:opacity-100"
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
      <div className="plan-card__actions flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onView}
            className={cn(
              'plan-card__secondary flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-edge py-2 text-sm font-medium text-ink3',
              'transition hover:border-accent/50 hover:bg-panel2 hover:text-ink',
            )}
          >
            View
          </button>
          <button
            type="button"
            onClick={onBrowse}
            className={cn(
              'plan-card__secondary flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-edge py-2 text-sm font-medium text-ink3',
              'transition hover:border-accent/50 hover:bg-panel2 hover:text-ink',
            )}
          >
            Browse &amp; add
          </button>
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={plan.itemCount === 0}
          className={cn(
            'plan-card__primary flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm',
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

// ─── Plan detail view ─────────────────────────────────────────────────────────

function PlanDetailView({
  onBack,
  onDelete,
  onBrowse,
  onStart,
}: {
  onBack: () => void;
  onDelete: () => void;
  onBrowse: () => void;
  onStart: () => void;
}) {
  const { activePlan, itemIds, completed, renamePlan, saving } = usePlan();

  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const commitTitle = useCallback(() => {
    const t = draftTitle.trim();
    if (t) renamePlan(t);
    setEditingTitle(false);
  }, [draftTitle, renamePlan]);

  useEffect(() => {
    if (editingTitle) {
      setDraftTitle(activePlan?.title ?? '');
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle, activePlan?.title]);

  if (!activePlan) return null;

  const completedCount = itemIds.filter((id) => completed.has(id)).length;
  const pct = itemIds.length > 0 ? Math.round((completedCount / itemIds.length) * 100) : 0;
  const allDone = itemIds.length > 0 && completedCount === itemIds.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-[var(--surface-glass)] px-4 shadow-[0_1px_0_color-mix(in_srgb,var(--border)_55%,transparent)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to plans"
          title="Back to plans"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-edge text-ink3 transition hover:bg-panel2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm [&>svg]:h-4 [&>svg]:w-4"
        >
          <BookMarked />
        </span>

        {/* Editable plan title */}
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              maxLength={200}
              aria-label="Rename plan"
              className="w-full rounded border border-accent/50 bg-panel2 px-1.5 py-0.5 text-sm font-semibold text-ink outline-none ring-2 ring-accent/15"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              title="Rename plan"
              className="group/title flex min-w-0 items-center gap-1 text-left hover:text-accent"
            >
              <span className="truncate font-semibold leading-tight text-ink transition-colors group-hover/title:text-accent">
                {activePlan.title}
              </span>
              <Pencil className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-60" />
            </button>
          )}
          <span className="block truncate text-[length:var(--fs-2xs)] font-medium uppercase tracking-[0.14em] text-ink3">
            bookmarked problems
            {saving && <Loader2 className="ml-1 inline h-2.5 w-2.5 animate-spin" />}
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 min-h-0 flex-col overflow-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {/* Progress summary */}
          {itemIds.length > 0 && (
            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className={cn('text-ink3', chromeText.xs)}>
                  {completedCount} / {itemIds.length} problems done
                </span>
                <span className={cn('text-ink3', chromeText.xs)}>{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    allDone ? 'bg-good' : 'bg-accent',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Problems table */}
          <section className="product-hub-card">
            <div className="product-hub-card__head mb-3">
              <div>
                <span className="product-hub-card__eyebrow">bookmarked</span>
                <h2>Problems</h2>
              </div>
            </div>
            <PlanProblemsTable />
          </section>

          {/* Footer CTAs */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onBrowse}
              className="inline-flex items-center gap-2 rounded-xl border border-edge px-4 py-2.5 text-sm font-medium text-ink3 transition hover:border-accent/50 hover:bg-panel2 hover:text-ink"
            >
              <Search className="h-4 w-4" />
              Browse to add problems
            </button>
            <button
              type="button"
              onClick={onStart}
              disabled={itemIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition hover:opacity-90 disabled:opacity-40"
            >
              <Play className="h-4 w-4" />
              Start run
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-edge px-4 py-2.5 text-sm font-medium text-ink3 transition hover:border-bad/50 hover:bg-panel2 hover:text-bad"
            >
              <Trash2 className="h-4 w-4" />
              Delete plan
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Plans page ────────────────────────────────────────────────────────────────

export function PlansPage() {
  const { configured, isAnonymous, loading } = useAuth();
  const { goHome, enterWorkspace, openProblem } = useWorkspace();
  const plan = usePlan();

  const [plans, setPlans] = useState<PrepPlanSummary[]>([]);
  const [fetching, setFetching] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [view, setView] = useState<'hub' | 'detail'>('hub');

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
      const loaded = await plan.loadPlan(planId);
      if (loaded) setView('detail');
    },
    [plan],
  );

  const handleView = useCallback(
    async (planId: string) => {
      await plan.loadPlan(planId);
      setView('detail');
    },
    [plan],
  );

  const handleBrowse = useCallback(
    async (planId: string) => {
      await plan.loadPlan(planId);
      enterWorkspace();
    },
    [plan, enterWorkspace],
  );

  const handleStart = useCallback(
    async (planId: string) => {
      const loaded = await plan.loadPlan(planId);
      if (loaded && loaded.items.length > 0) {
        plan.startRun(0);
        const firstItem = loaded.items[0];
        if (firstItem) openProblem(firstItem.itemId);
      } else {
        enterWorkspace();
      }
    },
    [plan, openProblem, enterWorkspace],
  );

  const handleDelete = useCallback(
    async (planId: string) => {
      await deletePrepPlan(planId);
      setDeleteConfirm(null);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      if (view === 'detail') {
        plan.closePlan();
        setView('hub');
      }
    },
    [view, plan],
  );

  const handleBackToHub = useCallback(async () => {
    setView('hub');
    // Refresh plan list to reflect any item count changes made in the detail view.
    await fetchPlans();
  }, [fetchPlans]);

  const handleDetailBrowse = useCallback(() => {
    enterWorkspace();
  }, [enterWorkspace]);

  const handleDetailStart = useCallback(async () => {
    if (!plan.activePlan) return;
    await handleStart(plan.activePlan.id);
  }, [plan.activePlan, handleStart]);

  const handleDetailDelete = useCallback(() => {
    if (plan.activePlan) setDeleteConfirm(plan.activePlan.id);
  }, [plan.activePlan]);

  return (
    <div
      className="relative isolate flex h-full flex-col overflow-hidden bg-bg"
      data-surface="plans"
      aria-label="Interview prep plans"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_0%,color-mix(in_srgb,var(--accent)_24%,transparent),transparent_28rem),radial-gradient(circle_at_88%_18%,rgba(248,214,121,0.12),transparent_24rem)]"
      />

      {view === 'detail' && !needsAuth ? (
        <PlanDetailView
          onBack={() => void handleBackToHub()}
          onBrowse={handleDetailBrowse}
          onStart={() => void handleDetailStart()}
          onDelete={handleDetailDelete}
        />
      ) : (
        <>
          {/* Top bar */}
          <PageHeader
            onBack={goHome}
            backLabel="Back to home"
            icon={<BookMarked />}
            eyebrow="focused study queues"
            title="Interview Prep Plans"
          />

          {/* Body */}
          <main className="flex flex-1 min-h-0 flex-col overflow-auto">
            {loading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-3xl border border-edge bg-panel/80 shadow-theme-md">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
                <p className="text-sm font-medium text-ink2">Loading your prep command center…</p>
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
                    Give your plan a name, then browse tracks to bookmark problems.
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
                        Create your first plan, then bookmark problems from any track to build a
                        focused prep queue.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {plans.map((p) => (
                        <PlanCard
                          key={p.id}
                          plan={p}
                          onView={() => void handleView(p.id)}
                          onBrowse={() => void handleBrowse(p.id)}
                          onStart={() => void handleStart(p.id)}
                          onDelete={() => setDeleteConfirm(p.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </main>
        </>
      )}

      {/* Delete confirmation overlay */}
      {deleteConfirm && (
        <div
          className="product-confirm-backdrop fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-md"
          onClick={() => setDeleteConfirm(null)}
          role="presentation"
        >
          <div
            className="product-confirm-modal w-full max-w-sm rounded-3xl border border-edge bg-panel/95 p-6 shadow-theme-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-plan-title"
          >
            <div className="product-confirm-modal__icon">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 id="delete-plan-title" className="mb-1 font-semibold text-ink">
              Delete plan?
            </h3>
            <p className={cn('mb-5 text-ink3', chromeText.sm)}>
              This will permanently delete the plan and all its bookmarked problems.
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
                onClick={() => void handleDelete(deleteConfirm)}
                className="product-confirm-modal__danger rounded-xl bg-bad px-4 py-2 text-sm font-semibold text-badbg shadow-theme-sm transition hover:opacity-90"
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
