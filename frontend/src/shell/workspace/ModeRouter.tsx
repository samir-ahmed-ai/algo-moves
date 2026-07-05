import type { ReactNode } from 'react';
import { ArrowLeft, Home, Loader2, RotateCcw, SearchX } from 'lucide-react';
import type { Frame, Player, ProblemPlugin } from '@/core';
import type { Item } from '@/content';
import { CategoryBoard, TrackCategoryBoard } from '../CategoryBoard';
import { LearnStudio } from '@/shell/study';
import { ProblemPage } from '@/shell/study';
import { resolveWorkspaceFallbackTarget, resolveWorkspaceSurface, type ModeRouterInput } from './surface';

import { CanvasStage, Btn, EmptyState } from '@/shell/canvas';
export interface ModeRouterProps extends Omit<ModeRouterInput, 'ready' | 'runtimeError'> {
  plugin: ProblemPlugin<any, any> | null | undefined;
  item: Item;
  inputId: string;
  selectInput: (id: string) => void;
  customInput: unknown;
  setCustomInput: (v: unknown) => void;
  frames: Frame<any>[];
  runtimeError: string | null;
  player: Player;
  frame: Frame<any> | undefined;
  backToBrowse: () => void;
  goHome: () => void;
}

export type RuntimeErrorRecovery = 'none' | 'reset-custom-input' | 'first-sample';

export function resolveRuntimeErrorRecovery(input: {
  customInput: unknown;
  inputId: string;
  firstInputId?: string;
}): RuntimeErrorRecovery {
  if (input.customInput != null) return 'reset-custom-input';
  if (input.firstInputId && input.inputId !== input.firstInputId) return 'first-sample';
  return 'none';
}

export function ModeRouter(props: ModeRouterProps) {
  const problemReady = !!props.plugin && !!props.frame;
  const surface = resolveWorkspaceSurface({ ...props, ready: problemReady, runtimeError: !!props.runtimeError });

  switch (surface) {
    case 'track-board':
      return props.activeTrackId ? <TrackCategoryBoard trackId={props.activeTrackId} /> : null;
    case 'category-board':
      return props.activeCategoryId ? <CategoryBoard categoryId={props.activeCategoryId} trackId={props.activeTrackId} /> : null;
    case 'canvas':
      return props.problemFocused && problemReady && props.plugin ? (
        <CanvasStage
          plugin={props.plugin}
          item={props.item}
          inputId={props.inputId}
          setInputId={props.selectInput}
          customInput={props.customInput}
          setCustomInput={props.setCustomInput}
          baseFrames={props.frames}
          player={props.player}
        />
      ) : (
        <CanvasStage standalone />
      );
    case 'play': {
      if (!props.plugin || !props.frame) return null;
      return (
        <ProblemPage
          plugin={props.plugin}
          item={props.item}
          inputId={props.inputId}
          setInputId={props.selectInput}
          customInput={props.customInput}
          setCustomInput={props.setCustomInput}
          frames={props.frames}
          player={props.player}
          frame={props.frame}
        />
      );
    }
    case 'learn': {
      if (!props.plugin || !props.frame) return null;
      return (
        <LearnStudio
          plugin={props.plugin}
          item={props.item}
          inputId={props.inputId}
          setInputId={props.selectInput}
          customInput={props.customInput}
          setCustomInput={props.setCustomInput}
          frames={props.frames}
          player={props.player}
          frame={props.frame}
        />
      );
    }
    case 'loading':
      return (
        <WorkspaceFallback
          icon={<Loader2 className="animate-spin" />}
          title={`Loading ${props.item.title}`}
          hint="Preparing the workspace for this problem."
          role="status"
        />
      );
    case 'error':
      return renderRuntimeErrorFallback(props);
    case 'empty': {
      const fallbackTarget = resolveWorkspaceFallbackTarget(props);
      const returnsToCatalog = fallbackTarget === 'catalog';
      return (
        <WorkspaceFallback
          icon={<SearchX />}
          title="Preview unavailable"
          hint={`${props.item.title} is not bound to an interactive preview yet.`}
          actionLabel={returnsToCatalog ? 'Back to catalog' : 'Go home'}
          actionIcon={returnsToCatalog ? <ArrowLeft className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}
          onAction={returnsToCatalog ? props.backToBrowse : props.goHome}
        />
      );
    }
  }
  return unreachableSurface(surface);
}

function renderRuntimeErrorFallback(props: ModeRouterProps) {
  const recovery = resolveRuntimeErrorRecovery({
    customInput: props.customInput,
    inputId: props.inputId,
    firstInputId: props.plugin?.inputs[0]?.id,
  });

  if (recovery === 'reset-custom-input') {
    return (
      <WorkspaceFallback
        icon={<SearchX />}
        title="Preview could not render"
        hint={props.runtimeError ?? 'Try another sample input or reset your custom edits.'}
        actionLabel="Reset custom input"
        actionIcon={<RotateCcw className="h-3.5 w-3.5" />}
        onAction={() => props.setCustomInput(null)}
        role="status"
      />
    );
  }

  if (recovery === 'first-sample') {
    const firstInputId = props.plugin?.inputs[0]?.id;
    if (firstInputId) {
      return (
        <WorkspaceFallback
          icon={<SearchX />}
          title="Preview could not render"
          hint={props.runtimeError ?? 'Try another sample input or reset your custom edits.'}
          actionLabel="Use first sample"
          actionIcon={<RotateCcw className="h-3.5 w-3.5" />}
          onAction={() => props.selectInput(firstInputId)}
          role="status"
        />
      );
    }
  }

  return (
    <WorkspaceFallback
      icon={<SearchX />}
      title="Preview could not render"
      hint={props.runtimeError ?? 'Try another sample input or reset your custom edits.'}
      role="status"
    />
  );
}

function unreachableSurface(surface: never): never {
  throw new Error(`Unhandled workspace surface: ${surface}`);
}

type WorkspaceFallbackProps = {
  icon: ReactNode;
  title: string;
  hint: string;
  role?: 'status';
} & (
  | {
      actionLabel: string;
      actionIcon?: ReactNode;
      onAction: () => void;
    }
  | {
      actionLabel?: never;
      actionIcon?: never;
      onAction?: never;
    }
);

function WorkspaceFallback({ icon, title, hint, role, actionLabel, actionIcon, onAction }: WorkspaceFallbackProps) {
  return (
    <div className="grid h-full w-full place-items-center bg-bg p-6" role={role} aria-live={role ? 'polite' : undefined}>
      <div className="flex flex-col items-center gap-1">
        <EmptyState icon={icon} title={title} hint={hint} />
        {actionLabel && (
          <Btn className="-mt-2" icon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Btn>
        )}
      </div>
    </div>
  );
}
