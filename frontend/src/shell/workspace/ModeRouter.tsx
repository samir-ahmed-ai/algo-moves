import type { Frame, Player, ProblemPlugin } from '@/core';
import type { Item } from '@/content';
import type { CanvasMode } from '@/core';
import type { TrackId } from '@/content';
import { CategoryBoard, TrackCategoryBoard } from '../CategoryBoard';
import { CanvasStage } from '../canvas/CanvasStage';
import { LearnStudio } from '@/shell/study';
import { ProblemPage } from '@/shell/study';

export type WorkspaceSurface =
  | 'track-board'
  | 'category-board'
  | 'canvas'
  | 'play'
  | 'learn'
  | 'loading'
  | 'empty';

export interface ModeRouterInput {
  activeTrackId: string | null;
  activeCategoryId: string | null;
  problemFocused: boolean;
  mode: CanvasMode;
  ready: boolean;
  pluginLoading: boolean;
}

export function resolveWorkspaceSurface(input: ModeRouterInput): WorkspaceSurface {
  const { activeTrackId, activeCategoryId, problemFocused, mode, ready, pluginLoading } = input;
  if (activeTrackId && !activeCategoryId && !problemFocused) return 'track-board';
  if (activeCategoryId && !problemFocused) return 'category-board';
  if (mode === 'visualize' && !problemFocused) return 'canvas';
  if (ready) return mode === 'play' ? 'play' : 'learn';
  if (pluginLoading) return 'loading';
  return 'empty';
}

export interface ModeRouterProps extends ModeRouterInput {
  trackId: TrackId;
  categoryId: string;
  plugin: ProblemPlugin<any, any> | null | undefined;
  item: Item;
  inputId: string;
  selectInput: (id: string) => void;
  customInput: unknown;
  setCustomInput: (v: unknown) => void;
  frames: Frame<any>[];
  player: Player;
  frame: Frame<any> | undefined;
}

export function ModeRouter(props: ModeRouterProps) {
  const surface = resolveWorkspaceSurface(props);

  switch (surface) {
    case 'track-board':
      return <TrackCategoryBoard trackId={props.trackId} />;
    case 'category-board':
      return <CategoryBoard categoryId={props.categoryId} trackId={props.activeTrackId as TrackId | null} />;
    case 'canvas':
      return <CanvasStage standalone />;
    case 'play':
      return (
        <ProblemPage
          plugin={props.plugin!}
          item={props.item}
          inputId={props.inputId}
          setInputId={props.selectInput}
          customInput={props.customInput}
          setCustomInput={props.setCustomInput}
          frames={props.frames}
          player={props.player}
          frame={props.frame!}
        />
      );
    case 'learn':
      return (
        <LearnStudio
          plugin={props.plugin!}
          item={props.item}
          inputId={props.inputId}
          setInputId={props.selectInput}
          customInput={props.customInput}
          setCustomInput={props.setCustomInput}
          frames={props.frames}
          player={props.player}
          frame={props.frame!}
        />
      );
    default:
      return null;
  }
}
