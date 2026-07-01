export type Choice = 'rock' | 'paper' | 'scissors';

export const CHOICES: { id: Choice; label: string; emoji: string }[] = [
  { id: 'rock', label: 'Rock', emoji: '✊' },
  { id: 'paper', label: 'Paper', emoji: '✋' },
  { id: 'scissors', label: 'Scissors', emoji: '✌️' },
];

/** What each choice beats. */
const BEATS: Record<Choice, Choice> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

export type RoundOutcome = 'win' | 'lose' | 'draw';

/** Outcome of `mine` versus `theirs`, from my perspective. */
export function outcome(mine: Choice, theirs: Choice): RoundOutcome {
  if (mine === theirs) return 'draw';
  return BEATS[mine] === theirs ? 'win' : 'lose';
}

/** First to this many round wins takes the match. */
export const WIN_TARGET = 3;

export function matchOver(myScore: number, peerScore: number): boolean {
  return myScore >= WIN_TARGET || peerScore >= WIN_TARGET;
}
