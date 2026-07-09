import { useRef, useState } from 'react';
import {
  Home,
  Lock,
  Magnet,
  Undo2,
  Redo2,
  Users,
  LayoutDashboard,
  LayoutGrid,
  PanelRight,
  Plus,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { nodeIcon } from '@/shell/panels';
import { usePopoverDismiss } from '../../ui/usePopoverDismiss';
import { chromeText } from '../../chromeUi';
import { RADIUS_SHELL } from './nodeui';
import { SessionBody } from '@/shell/collab';
import { AlignDropdown } from './CanvasTools';
import { InterviewInvitePopover } from './InterviewInvitePopover';

interface CanvasToolbarProps {
  lock: boolean;
  onToggleLock: () => void;
  onTidy: () => void;
  /** True on the standalone freeform canvas (enables the interview start CTA). */
  standalone?: boolean;
}

/** Minimal floating toolbar for the standalone freeform canvas. */
export function CanvasToolbar({
  lock,
  onToggleLock,
  onTidy,
  standalone = false,
}: CanvasToolbarProps) {
  const { goHome, canvasHud, canvasAdd, present, mode, canvasInterview, rightOpen, setRightOpen } =
    useWorkspace();
  const [addOpen, setAddOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [pendingInvite, setPendingInvite] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const collabRef = useRef<HTMLDivElement>(null);

  usePopoverDismiss(addRef, addOpen, () => setAddOpen(false));
  usePopoverDismiss(collabRef, collabOpen, () => setCollabOpen(false));

  if (present || !canvasHud) return null;

  const { snap, setSnap, tools } = canvasHud;
  const showAdd = mode === 'visualize' && canvasAdd != null;
  const hasAddItems =
    (canvasAdd?.addableKinds.length ?? 0) > 0 || (canvasAdd?.addableEffects?.length ?? 0) > 0;
  const showInterviewCta =
    standalone && mode === 'visualize' && canvasInterview != null && !canvasInterview.hasSession;

  const btnClass =
    'canvas-toolbar__button grid h-8 w-8 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink';

  return (
    <div
      className={cn(
        'canvas-toolbar nodrag absolute right-3 top-3 z-10 flex items-center gap-0.5 border border-edge bg-panel/95 p-1 shadow-[var(--shadow-lg)] backdrop-blur',
        RADIUS_SHELL,
      )}
    >
      {showInterviewCta && canvasInterview && (
        <>
          <button
            type="button"
            title="Start an interview session — spins up a shared room and invite link"
            disabled={pendingInvite}
            onClick={() => {
              setPendingInvite(true);
              canvasInterview.start();
            }}
            className={cn(
              'canvas-toolbar__interview inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-2.5 font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90 disabled:opacity-60',
              chromeText.sm,
            )}
          >
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Interview</span>
          </button>
          <span className="canvas-toolbar__divider mx-0.5 h-5 w-px bg-edge" aria-hidden />
        </>
      )}
      {showAdd && hasAddItems && (
        <div ref={addRef} className="relative">
          <button
            type="button"
            title="Add panel"
            aria-label="Add panel"
            aria-expanded={addOpen}
            onClick={() => setAddOpen((o) => !o)}
            className={cn(
              btnClass,
              addOpen && 'canvas-toolbar__button--active bg-accentbg text-accent',
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
          {addOpen && canvasAdd && (
            <div
              className={cn(
                'canvas-toolbar__popover canvas-toolbar__popover--add absolute right-0 top-full z-20 mt-1 max-h-[min(320px,50vh)] w-44 overflow-y-auto border border-edge bg-panel p-1 shadow-[var(--shadow-lg)]',
                RADIUS_SHELL,
              )}
            >
              {canvasAdd.addableKinds.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => {
                    canvasAdd.onAddKind(k.id);
                    setAddOpen(false);
                  }}
                  className={cn(
                    'canvas-toolbar__popover-item flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-ink2 transition-colors hover:bg-panel2 hover:text-ink',
                    chromeText.sm,
                  )}
                >
                  <span className="grid h-3.5 w-3.5 shrink-0 place-items-center">
                    {nodeIcon(k.id)}
                  </span>
                  {k.title}
                </button>
              ))}
              {canvasAdd.addableEffects?.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    canvasAdd.onAddEffect?.(e.id);
                    setAddOpen(false);
                  }}
                  className={cn(
                    'canvas-toolbar__popover-item flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-ink2 transition-colors hover:bg-panel2 hover:text-ink',
                    chromeText.sm,
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                  {e.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        title="Home"
        aria-label="Home"
        onClick={() => goHome()}
        className={btnClass}
      >
        <Home className="h-4 w-4" />
      </button>

      <div ref={collabRef} className="relative">
        <InterviewInvitePopover
          btnClass={btnClass}
          autoOpen={pendingInvite}
          onAutoOpenHandled={() => setPendingInvite(false)}
        />
        <button
          type="button"
          title="Collaborate"
          aria-label="Collaborate"
          aria-expanded={collabOpen}
          onClick={() => setCollabOpen((o) => !o)}
          className={cn(
            btnClass,
            collabOpen && 'canvas-toolbar__button--active bg-accentbg text-accent',
          )}
        >
          <Users className="h-4 w-4" />
        </button>
        {collabOpen && (
          <div
            className={cn(
              'canvas-toolbar__popover canvas-toolbar__popover--collab absolute right-0 top-full z-20 mt-1 w-72 border border-edge bg-panel p-3 shadow-[var(--shadow-lg)]',
              RADIUS_SHELL,
            )}
          >
            <SessionBody />
          </div>
        )}
      </div>

      <span className="canvas-toolbar__divider mx-0.5 h-5 w-px bg-edge" aria-hidden />

      <button
        type="button"
        title="Tidy layout"
        aria-label="Tidy layout"
        onClick={onTidy}
        className={btnClass}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>

      {mode === 'visualize' && (
        <button
          type="button"
          title="Fill canvas — tile all panels to fill the view"
          aria-label="Fill canvas"
          onClick={() => canvasHud.onFillCanvas()}
          className={btnClass}
        >
          <LayoutDashboard className="h-4 w-4" />
        </button>
      )}

      <button
        type="button"
        title={snap ? 'Disable snap to grid' : 'Snap to grid'}
        aria-label={snap ? 'Disable snap to grid' : 'Snap to grid'}
        aria-pressed={snap}
        onClick={() => setSnap(!snap)}
        className={cn(btnClass, snap && 'canvas-toolbar__button--active bg-accentbg text-accent')}
      >
        <Magnet className="h-4 w-4" />
      </button>

      <button
        type="button"
        title={lock ? 'Unlock canvas' : 'Lock canvas'}
        aria-label={lock ? 'Unlock canvas' : 'Lock canvas'}
        aria-pressed={lock}
        onClick={onToggleLock}
        className={cn(btnClass, lock && 'canvas-toolbar__button--active bg-accentbg text-accent')}
      >
        <Lock className="h-4 w-4" />
      </button>

      {tools.selCount >= 2 && (
        <AlignDropdown
          selCount={tools.selCount}
          onAlign={tools.onAlign}
          onDistribute={tools.onDistribute}
          triggerClassName={btnClass}
        />
      )}

      <span className="canvas-toolbar__divider mx-0.5 h-5 w-px bg-edge" aria-hidden />

      <button
        type="button"
        title="Undo"
        aria-label="Undo"
        disabled={!tools.canUndo}
        onClick={tools.onUndo}
        className={cn(btnClass, !tools.canUndo && 'opacity-40')}
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Redo"
        aria-label="Redo"
        disabled={!tools.canRedo}
        onClick={tools.onRedo}
        className={cn(btnClass, !tools.canRedo && 'opacity-40')}
      >
        <Redo2 className="h-4 w-4" />
      </button>

      <span className="canvas-toolbar__divider mx-0.5 h-5 w-px bg-edge" aria-hidden />

      <button
        type="button"
        title={rightOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-label={rightOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-pressed={rightOpen}
        onClick={() => setRightOpen(!rightOpen)}
        className={cn(
          btnClass,
          rightOpen && 'canvas-toolbar__button--active bg-accentbg text-accent',
        )}
      >
        <PanelRight className="h-4 w-4" />
      </button>
    </div>
  );
}
