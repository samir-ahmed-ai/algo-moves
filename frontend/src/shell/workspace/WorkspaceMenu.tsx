import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BookMarked,
  FileText,
  HelpCircle,
  Home,
  Library,
  Menu,
  Plus,
  Settings,
  Zap,
} from 'lucide-react';
import { RADIUS_SHELL } from '@/shell/canvas';
import { catalog, getSiblingItems } from '../../content';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../chromeUi';
import { usePopoverDismiss } from '../ui/usePopoverDismiss';
import { ExplorerSheet, type ExplorerFocus } from './ExplorerSheet';
import { AuthButton } from '@/shell/auth';

function MenuDivider() {
  return <div className="my-1 border-t border-edge" role="separator" />;
}

function MenuRow({
  icon,
  label,
  shortcut,
  accent,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full min-h-[var(--row)] items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-panel2',
        accent ? 'text-accent' : 'text-ink2 hover:text-ink',
      )}
    >
      <span className={cn('grid h-4 w-4 shrink-0 place-items-center', accent && 'text-accent')}>{icon}</span>
      <span className={cn('min-w-0 flex-1 truncate', chromeText.sm, accent && 'font-medium text-accent')}>{label}</span>
      {shortcut ? <span className={cn('shrink-0 tabular-nums text-ink3', chromeText.xs)}>{shortcut}</span> : null}
    </button>
  );
}

export interface WorkspaceMenuProps {
  onOpenPalette: () => void;
  onOpenHelp: () => void;
}

export interface WorkspaceMenuDropdownProps extends WorkspaceMenuProps {
  /** Smaller trigger for embedded chrome bars (e.g. Learn Studio). */
  compact?: boolean;
}

export function WorkspaceMenuDropdown({ onOpenPalette, onOpenHelp, compact }: WorkspaceMenuDropdownProps) {
  const { menuOpen, setMenuOpen, goHome, enterPlans, canvasAdd, setSettingsOpen, activeItemId, focusCanvas } = useWorkspace();
  const rootRef = useRef<HTMLDivElement>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerFocus, setExplorerFocus] = useState<ExplorerFocus>(null);

  const siblingItems = getSiblingItems(activeItemId, catalog);
  const showProblems = siblingItems.length >= 2;
  const showAdd = canvasAdd != null;

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setExplorerOpen(false);
  }, [setMenuOpen]);

  usePopoverDismiss(rootRef, menuOpen || explorerOpen, closeAll);

  useEffect(() => {
    if (focusCanvas) setExplorerOpen(false);
  }, [focusCanvas]);

  useEffect(() => {
    if (!menuOpen && !explorerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, explorerOpen, closeAll]);

  const openExplorer = (focus: ExplorerFocus) => {
    setExplorerFocus(focus);
    setExplorerOpen(true);
    setMenuOpen(false);
  };

  const pick = (fn: () => void) => {
    fn();
    closeAll();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        title="Menu"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
        className={cn(
          'grid place-items-center border border-edge bg-panel2 text-ink shadow-[var(--shadow-md)] transition-colors hover:bg-panel hover:text-ink',
          compact ? 'h-7 w-7 rounded-md' : cn('h-9 w-9', RADIUS_SHELL),
          menuOpen && 'bg-panel text-ink',
        )}
      >
        <Menu className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Workspace menu"
          className={cn(
            'absolute left-0 top-full z-30 mt-1.5 w-56 border border-edge bg-panel p-1.5 shadow-[var(--shadow-lg)]',
            RADIUS_SHELL,
          )}
        >
          <MenuRow icon={<Home className="h-4 w-4" />} label="Home" onClick={() => pick(goHome)} />
          <MenuRow
            icon={<BookMarked className="h-4 w-4" />}
            label="Interview plans"
            onClick={() => pick(enterPlans)}
          />
          <MenuRow
            icon={<Zap className="h-4 w-4" />}
            label="Command palette"
            shortcut="⌘K"
            accent
            onClick={() => pick(onOpenPalette)}
          />
          <MenuRow icon={<HelpCircle className="h-4 w-4" />} label="Help" shortcut="?" onClick={() => pick(onOpenHelp)} />

          <MenuDivider />

          <MenuRow
            icon={<Library className="h-4 w-4" />}
            label="Catalog"
            onClick={() => openExplorer('catalog')}
          />
          {showProblems && (
            <MenuRow
              icon={<FileText className="h-4 w-4" />}
              label="Problems"
              onClick={() => openExplorer('problems')}
            />
          )}
          {showAdd && (
            <MenuRow
              icon={<Plus className="h-4 w-4" />}
              label="Add panel"
              onClick={() => openExplorer('add')}
            />
          )}

          <MenuDivider />

          <MenuRow
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            onClick={() => pick(() => setSettingsOpen(true))}
          />
        </div>
      )}

      {explorerOpen && (
        <ExplorerSheet
          open={explorerOpen}
          focus={explorerFocus}
          onClose={() => setExplorerOpen(false)}
        />
      )}
    </div>
  );
}

export function WorkspaceMenu({ onOpenPalette, onOpenHelp }: WorkspaceMenuProps) {
  return (
    <header className="nodrag sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b border-edge bg-bg/90 px-3 py-2 backdrop-blur-sm">
      <AuthButton compact />
      <WorkspaceMenuDropdown onOpenPalette={onOpenPalette} onOpenHelp={onOpenHelp} />
    </header>
  );
}
