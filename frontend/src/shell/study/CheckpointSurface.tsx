import { useMemo, useState } from 'react';
import { Award, ArrowLeft, ArrowRight, RotateCcw, GraduationCap } from 'lucide-react';
import type { Item } from '@/content';
import { catalog } from '@/content';
import { getCheckpoint } from '@/content/checkpoints';
import { drawQuestions, scoreCheckpoint, type CheckpointResult } from '@/lib/quiz/checkpoint';
import { QuizChoiceLabel } from '@/components/shared/QuizChoiceLabel';
import { recordCheckpoint } from '@/store/persistence';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';

/** Renders a graded `kind:'quiz'` checkpoint — every answer counts, pass → certificate. */
export function CheckpointSurface({ item }: { item: Item }) {
  const { backToBrowse } = useWorkspace();
  const checkpoint = getCheckpoint(item.id);
  const questions = useMemo(
    () => (checkpoint ? drawQuestions(checkpoint.questions, checkpoint.drawCount) : []),
    [checkpoint],
  );

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => questions.map(() => null));
  const [result, setResult] = useState<CheckpointResult | null>(null);

  if (!checkpoint) {
    return (
      <div className="grid h-full w-full place-items-center bg-bg p-6 text-ink3">
        <span>Checkpoint unavailable.</span>
      </div>
    );
  }

  const courseTitle = catalog.courses.find((c) => c.id === checkpoint.courseId)?.title ?? 'course';

  const restart = () => {
    setAnswers(questions.map(() => null));
    setIndex(0);
    setResult(null);
  };

  const pick = (choiceIdx: number) => {
    const nextAnswers = answers.slice();
    nextAnswers[index] = choiceIdx;
    setAnswers(nextAnswers);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
    } else {
      const scored = scoreCheckpoint(questions, nextAnswers, checkpoint.passPct);
      recordCheckpoint(checkpoint.id, scored.pct, checkpoint.passPct);
      setResult(scored);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex shrink-0 items-center gap-2 border-b border-edge px-3 py-2">
        <button
          type="button"
          onClick={backToBrowse}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-ink3 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <span className="text-edge">/</span>
        <GraduationCap className="h-3.5 w-3.5 text-accent" />
        <span className="truncate text-sm font-semibold text-ink">{checkpoint.title}</span>
        {!result && (
          <span className="ml-auto text-xs text-ink3">
            {index + 1} / {questions.length} · pass {checkpoint.passPct}%
          </span>
        )}
      </header>

      <div className="ws-scroll grid min-h-0 flex-1 place-items-center overflow-auto p-6">
        {result ? (
          <ResultCard
            result={result}
            courseTitle={courseTitle}
            title={checkpoint.title}
            onRetry={restart}
            onDone={backToBrowse}
          />
        ) : (
          <div className="w-full max-w-[60ch]">
            <p className="mb-4 text-lg font-semibold text-ink">{questions[index]!.prompt}</p>
            <div className="flex flex-col gap-2">
              {questions[index]!.choices.map((choice, ci) => (
                <button
                  key={ci}
                  type="button"
                  onClick={() => pick(ci)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-accent',
                    answers[index] === ci ? 'border-accent bg-accent/5' : 'border-edge bg-panel2',
                  )}
                >
                  <QuizChoiceLabel label={choice.label} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  courseTitle,
  title,
  onRetry,
  onDone,
}: {
  result: CheckpointResult;
  courseTitle: string;
  title: string;
  onRetry: () => void;
  onDone: () => void;
}) {
  if (result.passed) {
    return (
      <div className="w-full max-w-[46ch] rounded-2xl border border-good/40 bg-goodbg p-6 text-center shadow-theme-md">
        <Award className="mx-auto mb-2 h-12 w-12 text-good" />
        <div className="text-xs font-bold uppercase tracking-widest text-good">Certificate</div>
        <h2 className="mt-1 text-xl font-bold text-ink">{courseTitle}</h2>
        <p className="mt-1 text-sm text-ink2">
          Passed <span className="font-semibold">{title}</span> with{' '}
          <span className="font-mono font-bold text-good">{result.pct}%</span> ({result.correct}/
          {result.total}).
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="w-full max-w-[46ch] rounded-2xl border border-edge bg-panel2 p-6 text-center">
      <div className="text-3xl font-bold text-ink">{result.pct}%</div>
      <p className="mt-1 text-sm text-ink2">
        {result.correct} of {result.total} correct — not quite there yet.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-edge bg-bg px-3 py-1.5 text-sm font-semibold text-ink hover:border-accent"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
