import { describe, expect, it } from 'vitest';
import { filterCommands, type CommandPaletteCommand } from './CommandPalette';

describe('filterCommands', () => {
  const commands: CommandPaletteCommand[] = [
    { id: 'mode:play', label: 'Mode: Play', hint: 'action', run: () => {} },
    { id: 'panel:stack', label: 'Add panel: Stack view', hint: 'panel', run: () => {} },
    { id: 'open:two-sum', label: 'Open Two Sum', hint: 'easy', run: () => {} },
  ];

  it('returns every command for an empty query', () => {
    expect(filterCommands(commands, '   ')).toBe(commands);
  });

  it('matches labels and hints case-insensitively', () => {
    expect(filterCommands(commands, 'STACK').map((command) => command.id)).toEqual(['panel:stack']);
    expect(filterCommands(commands, 'easy').map((command) => command.id)).toEqual(['open:two-sum']);
  });
});
