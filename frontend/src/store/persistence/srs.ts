import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';
import { createSyncStore } from '@/store/createSyncStore';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { readStorageJson } from './storage';

export interface SrsCard {
  problemId: string;
  /** Due timestamp (ms). */
  due: number;
  /** Current interval in days. */
  intervalDays: number;
  reps: number;
  /** FSRS v6 card state for scheduling continuity. */
  fsrs?: Card;
}

export interface SrsData {
  cards: Record<string, SrsCard>;
}

const KEY = STORAGE_KEYS.SRS_DECK;
const scheduler = fsrs();

function isSrsData(value: unknown): value is SrsData {
  const c = value as Partial<SrsData>;
  return !!c && typeof c === 'object' && !!c.cards && typeof c.cards === 'object';
}

/** Rehydrate Date fields after JSON parse. */
function hydrateCard(card: SrsCard): SrsCard {
  if (!card.fsrs) return card;
  return {
    ...card,
    fsrs: {
      ...card.fsrs,
      due: new Date(card.fsrs.due),
      last_review: card.fsrs.last_review ? new Date(card.fsrs.last_review) : undefined,
    },
  };
}

function load(): SrsData {
  const raw = readStorageJson(KEY, { cards: {} }, isSrsData);
  const cards: Record<string, SrsCard> = {};
  for (const [id, card] of Object.entries(raw.cards)) {
    cards[id] = hydrateCard(card);
  }
  return { cards };
}

const store = createSyncStore<SrsData>(KEY, load);

export function useSrsData(): SrsData {
  return store.use();
}

function toSrsCard(problemId: string, card: Card): SrsCard {
  return {
    problemId,
    due: card.due.getTime(),
    intervalDays: card.scheduled_days,
    reps: card.reps,
    fsrs: card,
  };
}

/** FSRS: correct → Good; wrong → Again (resets short-term learning). */
export function scheduleReview(problemId: string, correct: boolean): SrsCard {
  let next!: SrsCard;
  store.update((data) => {
    const prev = data.cards[problemId];
    const fsrsCard: Card = prev?.fsrs ?? createEmptyCard();
    const grade = correct ? Rating.Good : Rating.Again;
    const preview = scheduler.repeat(fsrsCard, new Date()) as Partial<
      Record<Rating, { card: Card }>
    >;
    const item = preview[grade];
    if (!item?.card) {
      next = toSrsCard(problemId, fsrsCard);
      return { cards: { ...data.cards, [problemId]: next } };
    }
    next = toSrsCard(problemId, item.card);
    return { cards: { ...data.cards, [problemId]: next } };
  });
  return next;
}

export function srsSortKey(problemId: string, cards: Record<string, SrsCard>): number {
  const card = cards[problemId];
  if (!card) return 0; // unseen — after overdue
  if (card.due <= Date.now()) return -1; // overdue
  return card.due;
}
