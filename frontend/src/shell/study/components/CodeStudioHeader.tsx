import { Fragment } from 'react';
import { Check, Copy, Keyboard, RotateCcw, SkipForward, WrapText } from 'lucide-react';
import { nodeIconGlyph, PanelHeaderAction, PanelHeaderMenu } from '@/shell/canvas';
import type { CodeStudioPhase } from '@/store/user-prefs';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { HeaderLangTabs } from '@/shell/panels/shared/codeVariants';
import {
  useCodeStudioContent,
  useCodeStudioDraft,
  useCodeStudioEditor,
  useCodeStudioPhase,
} from '@/shell/study/hooks/useCodeStudio';
import { RecallToolbar } from './RecallToolbar';

const PHASE_LABEL: Record<CodeStudioPhase, string> = {
  quiz: 'Quiz',
  reassemble: 'Structure',
  recall: 'Recall',
};

const STEP_GLYPH = ['①', '②', '③'];

function PhaseStepper({
  seq,
  phase,
  onJump,
}: {
  seq: CodeStudioPhase[];
  phase: CodeStudioPhase;
  onJump: (p: CodeStudioPhase) => void;
}) {
  if (seq.length < 2) return null;
  const curIdx = seq.indexOf(phase);
  return (
    <div
      className={cn(
        'code-studio-phase-stepper nodrag flex h-6 shrink-0 items-center gap-0.5 rounded-md bg-panel2 p-0.5 font-medium',
        chromeText.sm,
      )}
    >
      {seq.map((p, idx) => {
        const done = idx < curIdx;
        const active = idx === curIdx;
        return (
          <Fragment key={p}>
            {idx > 0 && (
              <span className="code-studio-phase-separator text-ink3" aria-hidden>
                →
              </span>
            )}
            <button
              type="button"
              title={`Go to ${PHASE_LABEL[p]}`}
              aria-current={active ? 'step' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onJump(p);
              }}
              className={cn(
                'code-studio-phase-step flex h-6 items-center gap-1 rounded px-1.5 transition-colors',
                active
                  ? 'code-studio-phase-step--active bg-accentbg text-accent'
                  : done
                    ? 'code-studio-phase-step--done text-good hover:bg-panel'
                    : 'code-studio-phase-step--todo text-ink3 hover:bg-panel hover:text-ink2',
              )}
            >
              <span aria-hidden className="code-studio-phase-glyph font-mono">
                {done ? '✓' : (STEP_GLYPH[idx] ?? String(idx + 1))}
              </span>
              {PHASE_LABEL[p]}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

function ToolbarDivider() {
  return (
    <span className="code-studio-toolbar-divider mx-0.5 h-4 w-px shrink-0 bg-edge" aria-hidden />
  );
}

function recallExtrasOverflow({
  copied,
  copyRef,
  hasReassemble,
  hasQuiz,
  resetReassemble,
  goToPhase,
}: {
  copied: boolean;
  copyRef: () => void | Promise<void>;
  hasReassemble: boolean;
  hasQuiz: boolean;
  resetReassemble: () => void;
  goToPhase: (p: CodeStudioPhase) => void;
}) {
  return [
    {
      label: copied ? 'Copied reference' : 'Copy reference',
      icon: copied ? <Check className={nodeIconGlyph} /> : <Copy className={nodeIconGlyph} />,
      onClick: () => void copyRef(),
    },
    ...(hasReassemble
      ? [
          {
            label: 'Restart structure phase',
            icon: <RotateCcw className={nodeIconGlyph} />,
            onClick: resetReassemble,
          },
        ]
      : []),
    ...(hasQuiz
      ? [
          {
            label: 'Retake the quiz',
            icon: <RotateCcw className={nodeIconGlyph} />,
            onClick: () => goToPhase('quiz'),
          },
        ]
      : []),
  ];
}

/** Inline header controls — icon-only with tooltips. */
export function CodeStudioToolbar() {
  const { variants, active, setActive, code } = useCodeStudioContent();
  const {
    blind,
    setBlind,
    peek,
    setPeek,
    persistDraft,
    timerRunning,
    setTimerRunning,
    timerLabel,
  } = useCodeStudioDraft();
  const { copied, copyRef, editorPrefs, setEditorPrefs, draftViewRef, formatBothRef, foldBothRef } =
    useCodeStudioEditor();
  const {
    phase,
    phaseSeq,
    goToPhase,
    advance,
    nextLabel,
    hasQuiz,
    hasReassemble,
    resetReassemble,
    phaseLocked,
  } = useCodeStudioPhase();

  if (phaseLocked) {
    const extras = recallExtrasOverflow({
      copied,
      copyRef,
      hasReassemble,
      hasQuiz,
      resetReassemble,
      goToPhase,
    });
    return (
      <>
        <HeaderLangTabs variants={variants} active={active} onPick={setActive} />
        {phase === 'recall' ? (
          <>
            <ToolbarDivider />
            <RecallToolbar
              blind={blind}
              setBlind={setBlind}
              peek={peek}
              setPeek={setPeek}
              persistDraft={persistDraft}
              timerRunning={timerRunning}
              setTimerRunning={setTimerRunning}
              timerLabel={timerLabel}
              editorPrefs={editorPrefs}
              setEditorPrefs={setEditorPrefs}
              compact={editorPrefs.recallCompact}
              draftViewRef={draftViewRef}
              formatBothRef={formatBothRef}
              foldBothRef={foldBothRef}
              {...(code?.lang ? { lang: code.lang } : {})}
              {...(extras.length > 0
                ? { trailing: <PanelHeaderMenu title="More actions" items={extras} /> }
                : {})}
            />
          </>
        ) : (
          hasReassemble && (
            <>
              <ToolbarDivider />
              <PanelHeaderAction
                variant="ghost"
                title="Restart structure"
                onClick={resetReassemble}
              >
                <RotateCcw className={nodeIconGlyph} />
              </PanelHeaderAction>
            </>
          )
        )}
      </>
    );
  }

  const extras = recallExtrasOverflow({
    copied,
    copyRef,
    hasReassemble,
    hasQuiz,
    resetReassemble,
    goToPhase,
  });

  const structureOverflow = [
    {
      label: editorPrefs.vim ? 'Disable Vim (⌘⌥V)' : 'Enable Vim (⌘⌥V)',
      icon: <Keyboard className={nodeIconGlyph} />,
      onClick: () => setEditorPrefs({ vim: !editorPrefs.vim }),
    },
    {
      label: editorPrefs.wrap ? 'Disable soft-wrap' : 'Enable soft-wrap',
      icon: <WrapText className={nodeIconGlyph} />,
      onClick: () => setEditorPrefs({ wrap: !editorPrefs.wrap }),
    },
    ...(hasQuiz
      ? [
          {
            label: 'Retake the quiz',
            icon: <RotateCcw className={nodeIconGlyph} />,
            onClick: () => goToPhase('quiz'),
          },
        ]
      : []),
  ];

  const showStepper = phaseSeq.length > 1;

  return (
    <>
      <PhaseStepper seq={phaseSeq} phase={phase} onJump={goToPhase} />
      {showStepper && <ToolbarDivider />}
      <HeaderLangTabs variants={variants} active={active} onPick={setActive} />
      {phase === 'recall' ? (
        <>
          <ToolbarDivider />
          <RecallToolbar
            blind={blind}
            setBlind={setBlind}
            peek={peek}
            setPeek={setPeek}
            persistDraft={persistDraft}
            timerRunning={timerRunning}
            setTimerRunning={setTimerRunning}
            timerLabel={timerLabel}
            editorPrefs={editorPrefs}
            setEditorPrefs={setEditorPrefs}
            compact={editorPrefs.recallCompact}
            draftViewRef={draftViewRef}
            formatBothRef={formatBothRef}
            foldBothRef={foldBothRef}
            {...(code?.lang ? { lang: code.lang } : {})}
            {...(extras.length > 0
              ? { trailing: <PanelHeaderMenu title="More actions" items={extras} /> }
              : {})}
          />
        </>
      ) : (
        <>
          <ToolbarDivider />
          <PanelHeaderAction
            variant="ghost"
            title={`Skip to ${nextLabel}`}
            onClick={() => advance()}
          >
            <SkipForward className={nodeIconGlyph} />
          </PanelHeaderAction>
          {hasReassemble && (
            <PanelHeaderAction variant="ghost" title="Restart structure" onClick={resetReassemble}>
              <RotateCcw className={nodeIconGlyph} />
            </PanelHeaderAction>
          )}
          {!hasReassemble && hasQuiz && (
            <PanelHeaderAction
              variant="ghost"
              title="Retake the quiz"
              onClick={() => goToPhase('quiz')}
            >
              <RotateCcw className={nodeIconGlyph} />
            </PanelHeaderAction>
          )}
          <PanelHeaderMenu title="More actions" items={structureOverflow} />
        </>
      )}
    </>
  );
}
