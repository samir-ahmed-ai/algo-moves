import { Map } from 'lucide-react';
import { useVimGame } from '../canvas/VimGameProvider';
import { LevelPanelContent } from './panels/LevelPanelContent';

export function VimLevelSidebar() {
  const { level } = useVimGame();

  return (
    <aside className="vim-studio-sidebar vim-studio-sidebar--left hidden min-h-0 min-[960px]:flex">
      <div className="w-[3px] shrink-0 bg-accent" aria-hidden />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-edge/40 px-3 py-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel2/80 text-accent">
            <Map className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">Level</span>
            <span className="block truncate text-[10px] text-ink3">{level.title}</span>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2.5 text-sm">
          <LevelPanelContent />
        </div>
      </div>
    </aside>
  );
}
