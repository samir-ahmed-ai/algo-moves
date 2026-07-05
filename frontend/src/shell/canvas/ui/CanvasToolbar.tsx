import { useRef, useState } from 'react';
import {
  Home,
  Lock,
  Magnet,
  Undo2,
  Redo2,
  Users,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { usePopoverDismiss } from '../../ui/usePopoverDismiss';
import { RADIUS_SHELL } from './nodeui';
import { SessionBody } from '../collab/collabWidgets';

interface CanvasToolbarProps {
  lock: boolean;
  onToggleLock: () => void;
  onTidy: () => void;
}

/** Minimal floating toolbar for the standalone freeform canvas. */
export function CanvasToolbar({ lock, onToggleLock, onTidy }: CanvasToolbarProps) {
  const { goHome, canvasHud, present } = useWorkspace();
  const [collabOpen, setCollabOpen] = useState(false);
  const collabRef = useRef<HTMLDivElement>(null);

  usePopoverDismiss(collabRef, collabOpen, () => setCollabOpen(false));

  if (present || !canvasHud) return null;

  const { snap, setSnap, tools } = canvasHud;

  const btnClass =
    'grid h-8 w-8 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink';

  return (
    <div
      className={cn(
        'nodrag absolute right-3 top-3 z-10 flex items-center gap-0.5 border border-edge bg-panel/95 p-1 shadow-[var(--shadow-lg)] backdrop-blur',
        RADIUS_SHELL,
      )}
    >
      <button type="button" title="Home" aria-label="Home" onClick={() => goHome()} className={btnClass}>
        <Home className="h-4 w-4" />
      </button>

      <div ref={collabRef} className="relative">
        <button
          type="button"
          title="Collaborate"
          aria-label="Collaborate"
          aria-expanded={collabOpen}
          onClick={() => setCollabOpen((o) => !o)}
          className={cn(btnClass, collabOpen && 'bg-accentbg text-accent')}
        >
          <Users className="h-4 w-4" />
        </button>
        {collabOpen && (
          <div
            className={cn(
              'absolute right-0 top-full z-20 mt-1 w-72 border border-edge bg-panel p-3 shadow-[var(--shadow-lg)]',
              RADIUS_SHELL,
            )}
          >
            <SessionBody />
          </div>
        )}
      </div>

      <button
        type="button"
        title="Tidy layout"
        aria-label="Tidy layout"
        onClick={onTidy}
        className={btnClass}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>

      <button
        type="button"
        title={snap ? 'Disable snap to grid' : 'Snap to grid'}
        aria-label={snap ? 'Disable snap to grid' : 'Snap to grid'}
        aria-pressed={snap}
        onClick={() => setSnap(!snap)}
        className={cn(btnClass, snap && 'bg-accentbg text-accent')}
      >
        <Magnet className="h-4 w-4" />
      </button>

      <button
        type="button"
        title={lock ? 'Unlock canvas' : 'Lock canvas'}
        aria-label={lock ? 'Unlock canvas' : 'Lock canvas'}
        aria-pressed={lock}
        onClick={onToggleLock}
        className={cn(btnClass, lock && 'bg-accentbg text-accent')}
      >
        <Lock className="h-4 w-4" />
      </button>

      <span className="mx-0.5 h-5 w-px bg-edge" aria-hidden />

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
    </div>
  );
}
