import type { Item } from '@/content';
import { parseSearchTerms, scoreDocument, type SearchDocument } from '@/lib/search';
import type { CanvasInterviewControls } from '@/store/workspace';

export interface CommandPaletteCommand {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  run: () => void;
}

export interface CommandPaletteSection {
  id: string;
  label: string;
  commands: CommandPaletteCommand[];
}

function commandToDoc(command: CommandPaletteCommand): SearchDocument {
  return {
    kind: 'action',
    id: command.id,
    title: command.label,
    ...(command.hint ? { subtitle: command.hint } : {}),
    ...(command.keywords?.length ? { keywords: command.keywords } : {}),
  };
}

export function filterCommands(
  commands: CommandPaletteCommand[],
  query: string,
): CommandPaletteCommand[] {
  const terms = parseSearchTerms(query);
  if (terms.length === 0) return commands;
  return commands
    .map((command, index) => ({
      command,
      index,
      score: scoreDocument(commandToDoc(command), terms),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((match) => match.command);
}

export type CommandSelectionKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

export function resolveCommandSelection(
  current: number,
  count: number,
  key: CommandSelectionKey,
): number {
  if (count <= 0) return 0;
  const clamped = Math.min(Math.max(current, 0), count - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return (clamped + (key === 'ArrowDown' ? 1 : -1) + count) % count;
}

export function buildOpenProblemCommand(
  item: Item,
  openProblem: (id: string) => void,
): CommandPaletteCommand {
  return {
    id: `open:${item.id}`,
    label: `Open ${item.title}`,
    hint: item.difficulty ?? 'problem',
    keywords: compactKeywords([
      item.id,
      item.pluginId,
      item.summary,
      item.courseId,
      item.topicId,
      item.source?.label,
      ...item.tags,
    ]),
    run: () => openProblem(item.id),
  };
}

function compactKeywords(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)),
  );
}

/** Interview session commands — only offered while canvas chrome publishes the controls. */
export function buildInterviewCommands(
  interview: CanvasInterviewControls | null,
): CommandPaletteCommand[] {
  if (!interview) return [];
  const commands: CommandPaletteCommand[] = [];
  if (!interview.hasSession) {
    commands.push({
      id: 'interview:start',
      label: 'Start interview session',
      hint: 'interview',
      keywords: ['collab', 'room', 'host', 'whiteboard'],
      run: () => interview.start(),
    });
  }
  if (interview.hasSession && interview.isHost) {
    commands.push({
      id: 'interview:invite',
      label: 'Copy interview invite link',
      hint: 'interview',
      keywords: ['guest', 'share', 'url', 'candidate'],
      run: () => {
        void interview.copyInvite();
      },
    });
  }
  if (interview.hasSession && interview.isHost) {
    commands.push(
      {
        id: 'interview:timer',
        label: interview.timerRunning ? 'Pause timer' : 'Start timer',
        hint: 'interview',
        keywords: ['clock', 'countdown', 'stopwatch'],
        run: () => interview.toggleTimer(),
      },
      {
        id: 'interview:timer-reset',
        label: 'Reset timer',
        hint: 'interview',
        keywords: ['clock', 'countdown', 'restart'],
        run: () => interview.resetTimer(),
      },
      {
        id: 'interview:lock',
        label: interview.locked ? 'Unlock board' : 'Lock board',
        hint: 'interview',
        keywords: ['freeze', 'read only', 'candidate'],
        run: () => interview.toggleLock(),
      },
    );
  }
  if (interview.hasSession && interview.isHost) {
    commands.push({
      id: 'interview:end',
      label: 'End interview',
      hint: 'interview',
      keywords: ['leave', 'stop', 'session', 'finish'],
      run: () => interview.end(),
    });
  }
  return commands;
}

export function parseCommandSelectionKey(key: string): CommandSelectionKey | null {
  return key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End' ? key : null;
}

export function buildCommandPaletteSections(
  commands: CommandPaletteCommand[],
  query: string,
  recentCommandIds: string[],
): CommandPaletteSection[] {
  const filtered = filterCommands(commands, query);
  if (filtered.length === 0) return [];
  if (query.trim()) return [{ id: 'results', label: 'Results', commands: filtered }];

  const byId = new Map(filtered.map((command) => [command.id, command] as const));
  const recentCommands = recentCommandIds
    .map((id) => byId.get(id))
    .filter((command): command is CommandPaletteCommand => !!command);
  const recentIds = new Set(recentCommands.map((command) => command.id));
  const sections: CommandPaletteSection[] = [];
  if (recentCommands.length > 0)
    sections.push({ id: 'recent', label: 'Recent', commands: recentCommands });
  const allCommands = filtered.filter((command) => !recentIds.has(command.id));
  if (allCommands.length > 0)
    sections.push({ id: 'all', label: 'All commands', commands: allCommands });
  return sections;
}
