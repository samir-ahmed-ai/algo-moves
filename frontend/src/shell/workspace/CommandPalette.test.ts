import { describe, expect, it, vi } from 'vitest';
import type { CanvasInterviewControls } from '@/store/workspace';
import {
  buildCommandPaletteSections,
  buildInterviewCommands,
  buildOpenProblemCommand,
  filterCommands,
  resolveCommandSelection,
  type CommandPaletteCommand,
} from './CommandPalette';

describe('filterCommands', () => {
  const commands: CommandPaletteCommand[] = [
    { id: 'mode:play', label: 'Mode: Play', hint: 'action', run: () => {} },
    { id: 'mode:practice', label: 'Practice mode', hint: 'action', run: () => {} },
    { id: 'panel:stack', label: 'Add panel: Stack view', hint: 'panel', run: () => {} },
    { id: 'open:two-sum', label: 'Open Two Sum', hint: 'easy', run: () => {} },
    {
      id: 'palette',
      label: 'Enable colour-blind palette',
      hint: 'action',
      keywords: ['color blind', 'colorblind', 'accessibility'],
      run: () => {},
    },
  ];

  it('returns every command for an empty query', () => {
    expect(filterCommands(commands, '   ')).toBe(commands);
  });

  it('matches labels and hints case-insensitively', () => {
    expect(filterCommands(commands, 'STACK').map((command) => command.id)).toEqual(['panel:stack']);
    expect(filterCommands(commands, 'easy').map((command) => command.id)).toEqual(['open:two-sum']);
  });

  it('requires every query term to match somewhere in the command', () => {
    expect(filterCommands(commands, 'two easy').map((command) => command.id)).toEqual([
      'open:two-sum',
    ]);
    expect(filterCommands(commands, 'two panel')).toEqual([]);
  });

  it('matches aliases and punctuation-free queries', () => {
    expect(filterCommands(commands, 'colorblind').map((command) => command.id)).toEqual([
      'palette',
    ]);
    expect(filterCommands(commands, 'two-sum').map((command) => command.id)).toEqual([
      'open:two-sum',
    ]);
    expect(filterCommands(commands, 'twosum').map((command) => command.id)).toEqual([
      'open:two-sum',
    ]);
  });

  it('prioritizes label-prefix matches while preserving stable ties', () => {
    expect(filterCommands(commands, 'mode').map((command) => command.id)).toEqual([
      'mode:play',
      'mode:practice',
    ]);
  });
});

describe('buildOpenProblemCommand', () => {
  it('adds catalog metadata to searchable problem keywords', () => {
    const command = buildOpenProblemCommand(
      {
        id: 'two-sum',
        kind: 'problem',
        pluginId: 'two-sum-plugin',
        title: 'Two Sum',
        summary: 'Find a pair of numbers',
        difficulty: 'Easy',
        tags: ['hash-map', 'arrays'],
        source: { label: 'LeetCode', url: 'https://example.com' },
        status: 'todo',
        prereqs: [],
        courseId: 'data-structures',
        topicId: 'arrays',
      },
      () => {},
    );

    expect(command.keywords).toEqual([
      'two-sum',
      'two-sum-plugin',
      'Find a pair of numbers',
      'data-structures',
      'arrays',
      'LeetCode',
      'hash-map',
    ]);
    expect(filterCommands([command], 'leetcode hash')).toEqual([command]);
    expect(filterCommands([command], 'datastructures')).toEqual([command]);
  });
});

describe('resolveCommandSelection', () => {
  it('wraps through the command list', () => {
    expect(resolveCommandSelection(0, 3, 'ArrowUp')).toBe(2);
    expect(resolveCommandSelection(2, 3, 'ArrowDown')).toBe(0);
  });

  it('jumps to the first and last commands', () => {
    expect(resolveCommandSelection(2, 4, 'Home')).toBe(0);
    expect(resolveCommandSelection(0, 4, 'End')).toBe(3);
  });

  it('clamps stale selection indexes before moving', () => {
    expect(resolveCommandSelection(8, 3, 'ArrowDown')).toBe(0);
    expect(resolveCommandSelection(-3, 3, 'ArrowUp')).toBe(2);
  });

  it('stays at zero for an empty command list', () => {
    expect(resolveCommandSelection(4, 0, 'ArrowDown')).toBe(0);
  });
});

describe('buildInterviewCommands', () => {
  function controls(overrides: Partial<CanvasInterviewControls> = {}): CanvasInterviewControls {
    return {
      hasSession: false,
      isHost: false,
      sessionActive: false,
      timerRunning: false,
      locked: false,
      start: vi.fn(),
      copyInvite: vi.fn(),
      toggleTimer: vi.fn(),
      resetTimer: vi.fn(),
      toggleLock: vi.fn(),
      end: vi.fn(),
      ...overrides,
    };
  }

  it('returns no commands when the interview contract is absent', () => {
    expect(buildInterviewCommands(null)).toEqual([]);
  });

  it('offers only start before a session exists (timer/lock are host-in-session only)', () => {
    const ids = buildInterviewCommands(controls()).map((command) => command.id);
    expect(ids).toEqual(['interview:start']);
  });

  it('offers invite, timer, lock and end to the host of a live session', () => {
    const ids = buildInterviewCommands(controls({ hasSession: true, isHost: true })).map(
      (command) => command.id,
    );
    expect(ids).toEqual([
      'interview:invite',
      'interview:timer',
      'interview:timer-reset',
      'interview:lock',
      'interview:end',
    ]);
  });

  it('hides all host-only commands from guests in a session', () => {
    const ids = buildInterviewCommands(controls({ hasSession: true, isHost: false })).map(
      (command) => command.id,
    );
    expect(ids).toEqual([]);
  });

  it('reflects timer and lock state in the labels (host in session)', () => {
    const idle = buildInterviewCommands(controls({ hasSession: true, isHost: true }));
    expect(idle.find((command) => command.id === 'interview:timer')?.label).toBe('Start timer');
    expect(idle.find((command) => command.id === 'interview:lock')?.label).toBe('Lock board');

    const busy = buildInterviewCommands(
      controls({ hasSession: true, isHost: true, timerRunning: true, locked: true }),
    );
    expect(busy.find((command) => command.id === 'interview:timer')?.label).toBe('Pause timer');
    expect(busy.find((command) => command.id === 'interview:lock')?.label).toBe('Unlock board');
  });

  it('wires each command to its control callback', () => {
    const api = controls({ hasSession: true, isHost: true });
    const byId = new Map(buildInterviewCommands(api).map((command) => [command.id, command]));
    byId.get('interview:invite')?.run();
    byId.get('interview:timer')?.run();
    byId.get('interview:timer-reset')?.run();
    byId.get('interview:lock')?.run();
    byId.get('interview:end')?.run();
    expect(api.copyInvite).toHaveBeenCalledTimes(1);
    expect(api.toggleTimer).toHaveBeenCalledTimes(1);
    expect(api.resetTimer).toHaveBeenCalledTimes(1);
    expect(api.toggleLock).toHaveBeenCalledTimes(1);
    expect(api.end).toHaveBeenCalledTimes(1);

    const fresh = controls();
    buildInterviewCommands(fresh)
      .find((command) => command.id === 'interview:start')
      ?.run();
    expect(fresh.start).toHaveBeenCalledTimes(1);
  });
});

describe('buildCommandPaletteSections', () => {
  const commands: CommandPaletteCommand[] = [
    { id: 'mode:play', label: 'Mode: Play', hint: 'action', run: () => {} },
    { id: 'settings', label: 'Open settings', hint: 'action', run: () => {} },
    { id: 'share', label: 'Copy share link', hint: 'action', run: () => {} },
  ];

  it('surfaces recent commands first when the query is empty', () => {
    expect(buildCommandPaletteSections(commands, '', ['share', 'mode:play'])).toEqual([
      {
        id: 'recent',
        label: 'Recent',
        commands: [commands[2], commands[0]],
      },
      {
        id: 'all',
        label: 'All commands',
        commands: [commands[1]],
      },
    ]);
  });

  it('collapses to a single results section while searching', () => {
    expect(buildCommandPaletteSections(commands, 'settings', ['share'])).toEqual([
      {
        id: 'results',
        label: 'Results',
        commands: [commands[1]],
      },
    ]);
  });
});
