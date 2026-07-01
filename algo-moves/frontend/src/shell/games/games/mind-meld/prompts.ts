export interface MeldPrompt {
  q: string;
  a: string;
  b: string;
}

/** Fixed, ordered this-or-that prompts. Both players answer them in this order. */
export const MELD_PROMPTS: MeldPrompt[] = [
  { q: 'Ideal escape?', a: 'Beach', b: 'Mountains' },
  { q: 'Team...', a: 'Cats', b: 'Dogs' },
  { q: 'Flavor', a: 'Sweet', b: 'Savory' },
  { q: 'You are a...', a: 'Early bird', b: 'Night owl' },
  { q: 'Reach out by', a: 'Text', b: 'Call' },
  { q: 'Movie night', a: 'Netflix in', b: 'Cinema out' },
  { q: 'Morning fuel', a: 'Coffee', b: 'Tea' },
  { q: 'With money you', a: 'Save', b: 'Spend' },
  { q: 'On a plane', a: 'Window', b: 'Aisle' },
  { q: 'Weekend plan', a: 'Planned', b: 'Spontaneous' },
];
