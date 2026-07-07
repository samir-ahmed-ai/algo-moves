import type { GameLocale } from '../../locale';
import { getGameCommonStrings, type GameCommonStrings } from '../../locale/gameCommon';

export type TicTacToeStrings = GameCommonStrings & {
  title: string;
  tagline: string;
  draws: string;
  /** Whose turn banner, e.g. "Your move · X". */
  yourMove: (mark: string) => string;
  peerMove: (name: string, mark: string) => string;
  youWin: string;
  peerWins: (name: string) => string;
  draw: string;
  /** Detail line under the result banner. */
  completesLine: (mark: string) => string;
  boardFull: string;
  /** Read-only spectator header. */
  watching: string;
  spectatorTurn: (name: string, mark: string) => string;
  /** Announced when a slow player's timer expires and a cell is auto-placed. */
  autoPlaced: string;
};

const STRINGS: Record<GameLocale, TicTacToeStrings> = {
  ar: {
    ...getGameCommonStrings('ar'),
    title: 'إكس أو',
    tagline: 'ثلاثة في صف — إكس يبدأ، وأو يرد.',
    draws: 'تعادل',
    yourMove: (mark) => `دورك · ${mark}`,
    peerMove: (name, mark) => `دور ${name} · ${mark}`,
    youWin: '🎉 فزت!',
    peerWins: (name) => `${name} فاز`,
    draw: 'تعادل',
    completesLine: (mark) => `${mark} أكمل صفاً`,
    boardFull: 'امتلأت اللوحة — لا أحد جمع ثلاثة.',
    watching: 'مشاهدة',
    spectatorTurn: (name, mark) => `دور ${name} · ${mark}`,
    autoPlaced: 'انتهى الوقت — لعبة تلقائية',
  },
  en: {
    ...getGameCommonStrings('en'),
    title: 'Tic-Tac-Toe',
    tagline: 'Three in a row — X moves first, O answers back.',
    draws: 'draws',
    yourMove: (mark) => `Your move · ${mark}`,
    peerMove: (name, mark) => `${name}'s move · ${mark}`,
    youWin: '🎉 You win!',
    peerWins: (name) => `${name} wins`,
    draw: "It's a draw",
    completesLine: (mark) => `${mark} completes a line`,
    boardFull: 'Board full — nobody got three.',
    watching: 'Watching',
    spectatorTurn: (name, mark) => `${name}'s move · ${mark}`,
    autoPlaced: 'Time up — auto-played',
  },
};

export function getTicTacToeStrings(locale: GameLocale): TicTacToeStrings {
  return STRINGS[locale];
}
