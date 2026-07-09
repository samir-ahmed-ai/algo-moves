import { useEffect, useId, useMemo, useState } from 'react';
import {
  buildCommandPaletteSections,
  buildInterviewCommands,
  buildOpenProblemCommand,
  filterCommands,
  parseCommandSelectionKey,
  resolveCommandSelection,
  type CommandPaletteCommand,
  type CommandPaletteSection,
  type CommandSelectionKey,
} from './commandPaletteModel';
import { openGlobalSearch } from '@/shell/search';

export type { CommandPaletteCommand, CommandPaletteSection, CommandSelectionKey };
export {
  buildCommandPaletteSections,
  buildInterviewCommands,
  buildOpenProblemCommand,
  filterCommands,
  resolveCommandSelection,
};

/**
 * Workspace command palette — delegates to the app-wide GlobalSearch dialog.
 * Kept as a thin wrapper so WorkspaceMenu / ModeRouter `onOpenPalette` keep working.
 */
export function CommandPalette({
  inputId: _inputId,
  onClose,
}: {
  inputId: string;
  onClose: () => void;
}) {
  void _inputId;
  useEffect(() => {
    openGlobalSearch();
    onClose();
  }, [onClose]);
  return null;
}

/** @deprecated Prefer GlobalSearchDialog — retained for tests that import palette UI pieces. */
export function CommandPaletteLegacyShell({
  commands,
  onClose,
}: {
  commands: CommandPaletteCommand[];
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const listboxId = useId();
  const sections = useMemo(() => buildCommandPaletteSections(commands, q, []), [commands, q]);
  const visible = useMemo(() => sections.flatMap((s) => s.commands), [sections]);
  const clamped = visible.length ? Math.min(sel, visible.length - 1) : 0;

  return (
    <div role="dialog" onClick={onClose}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSel(0);
        }}
        onKeyDown={(e) => {
          const key = parseCommandSelectionKey(e.key);
          if (key) {
            e.preventDefault();
            setSel((s) => resolveCommandSelection(s, visible.length, key));
          } else if (e.key === 'Enter') {
            visible[clamped]?.run();
            onClose();
          } else if (e.key === 'Escape') onClose();
        }}
        aria-controls={listboxId}
      />
      <div id={listboxId} role="listbox">
        {visible.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={i === clamped}
            onClick={() => {
              c.run();
              onClose();
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
