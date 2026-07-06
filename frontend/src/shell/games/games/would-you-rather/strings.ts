import type { CompatLabel } from './logic';

export interface WyrStrings {
  title: string;
  tagline: string;
  wouldYouRather: string;
  orWouldYouRather: string;
  pickOne: string;
  waitingFor: (name: string) => string;
  youPicked: string;
  matched: string;
  noMatch: string;
  roundLabel: (n: number, total: number) => string;
  matchCount: (n: number) => string;
  scoreLabel: string;
  playAgain: string;
  finalTitle: (matches: number, total: number) => string;
  compat: Record<CompatLabel, string>;
  timesUp: string;
  optionA: string;
  optionB: string;
  chooseCategoriesTitle: string;
  chooseCategoriesHint: string;
  allCategories: string;
  startGame: string;
  categoryPick: string;
  you: string;
  partner: string;
  spectating: string;
  spectatorWaiting: string;
  pointsEach: string;
  braveryPoint: string;
}

export const WYR_STRINGS: WyrStrings = {
  title: 'Would You Rather?',
  tagline: 'Two impossible choices — which do you pick, and does your partner agree?',
  wouldYouRather: 'Would you rather…',
  orWouldYouRather: '…or would you rather…',
  pickOne: 'Tap to pick your answer!',
  waitingFor: (name) => `Waiting for ${name}…`,
  youPicked: 'You picked!',
  matched: 'You matched! 💞',
  noMatch: 'You differ — interesting! ✨',
  roundLabel: (n, total) => `Round ${n} of ${total}`,
  matchCount: (n) => `${n} matched`,
  scoreLabel: 'Score',
  playAgain: 'Play again',
  finalTitle: (matches, total) => `You matched on ${matches} of ${total}!`,
  compat: {
    soulmates: 'You two are soulmates 💑',
    wellMatched: 'You\'re pretty well matched 💫',
    beautyInDifference: 'Opposites attract — beautiful! ✨',
  },
  timesUp: "Time's up!",
  optionA: 'Option A',
  optionB: 'Option B',
  chooseCategoriesTitle: 'Pick your vibe',
  chooseCategoriesHint: 'Choose which kinds of questions you want. Leave all off for a mix!',
  allCategories: 'Mix of everything',
  startGame: 'Start game',
  categoryPick: 'Choose categories',
  you: 'You',
  partner: 'Partner',
  spectating: 'Spectating',
  spectatorWaiting: 'Waiting for players to begin…',
  pointsEach: '+2 pts each',
  braveryPoint: '+1 pt each',
};
