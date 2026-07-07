export type WyrCategory = 'fun' | 'deep' | 'romantic' | 'spicy';

export interface WyrPrompt {
  id: string;
  a: string;
  b: string;
  category: WyrCategory;
}

export const WYR_PROMPTS: WyrPrompt[] = [
  // --- fun ---
  { id: 'f01', a: 'Always be 10 minutes early', b: 'Always be 10 minutes late', category: 'fun' },
  {
    id: 'f02',
    a: 'Never use social media again',
    b: 'Never watch TV/movies again',
    category: 'fun',
  },
  {
    id: 'f03',
    a: 'Have unlimited money but no free time',
    b: 'Have unlimited free time but no money',
    category: 'fun',
  },
  { id: 'f04', a: 'Be able to fly', b: 'Be able to breathe underwater', category: 'fun' },
  { id: 'f05', a: 'Live in the mountains', b: 'Live by the beach', category: 'fun' },
  {
    id: 'f06',
    a: 'Only eat sweet foods forever',
    b: 'Only eat savory foods forever',
    category: 'fun',
  },
  { id: 'f07', a: 'Know how you die', b: 'Know exactly when you die', category: 'fun' },
  { id: 'f08', a: 'Talk to animals', b: 'Speak every human language fluently', category: 'fun' },
  {
    id: 'f09',
    a: 'Have a photographic memory',
    b: 'Be able to forget anything you choose',
    category: 'fun',
  },
  {
    id: 'f10',
    a: 'Always have to sing instead of speak',
    b: 'Always have to dance instead of walk',
    category: 'fun',
  },
  { id: 'f11', a: 'Wake up famous tomorrow', b: 'Wake up a genius tomorrow', category: 'fun' },
  {
    id: 'f12',
    a: 'Have skin that changes color with your mood',
    b: 'Have hair that glows in the dark',
    category: 'fun',
  },
  { id: 'f13', a: 'Live in a video game world', b: 'Live in a movie world', category: 'fun' },
  {
    id: 'f14',
    a: 'Only communicate by texting',
    b: 'Only communicate by voice calls',
    category: 'fun',
  },
  { id: 'f15', a: 'Have a personal chef', b: 'Have a personal driver', category: 'fun' },

  // --- deep ---
  {
    id: 'd01',
    a: 'Know the truth behind every mystery',
    b: 'Keep the wonder of the unknown',
    category: 'deep',
  },
  {
    id: 'd02',
    a: 'Change one thing about the past',
    b: 'Guarantee one thing about the future',
    category: 'deep',
  },
  {
    id: 'd03',
    a: 'Be remembered for something you did',
    b: 'Be deeply loved by a few close people',
    category: 'deep',
  },
  {
    id: 'd04',
    a: 'Live a short but extraordinary life',
    b: 'Live a long, quiet ordinary life',
    category: 'deep',
  },
  {
    id: 'd05',
    a: 'Always know when someone is lying',
    b: 'Always be believed when you tell the truth',
    category: 'deep',
  },
  {
    id: 'd06',
    a: 'Have true inner peace but no excitement',
    b: 'Have thrilling highs and painful lows',
    category: 'deep',
  },
  {
    id: 'd07',
    a: 'Be always honest even when it hurts',
    b: 'Protect people with kind white lies',
    category: 'deep',
  },
  {
    id: 'd08',
    a: 'Follow your passion and struggle',
    b: 'Follow a steady path and be comfortable',
    category: 'deep',
  },
  {
    id: 'd09',
    a: 'Know what everyone really thinks of you',
    b: 'Never care what anyone thinks of you',
    category: 'deep',
  },
  {
    id: 'd10',
    a: 'Sacrifice now for a better future',
    b: 'Live fully in the present moment',
    category: 'deep',
  },

  // --- romantic ---
  {
    id: 'r01',
    a: 'Surprise date at a mystery location',
    b: 'Carefully planned date night you both choose',
    category: 'romantic',
  },
  {
    id: 'r02',
    a: 'Write your partner a love letter',
    b: 'Give your partner a meaningful gift',
    category: 'romantic',
  },
  {
    id: 'r03',
    a: 'Slow dance in the kitchen at midnight',
    b: 'Watch the sunrise together on a road trip',
    category: 'romantic',
  },
  {
    id: 'r04',
    a: 'Be the one who plans all dates',
    b: 'Be surprised by all the dates your partner plans',
    category: 'romantic',
  },
  {
    id: 'r05',
    a: 'Express love through words',
    b: 'Express love through actions',
    category: 'romantic',
  },
  {
    id: 'r06',
    a: 'Spend every night together',
    b: 'Have occasional nights apart to miss each other',
    category: 'romantic',
  },
  {
    id: 'r07',
    a: 'Know exactly how your partner is feeling',
    b: "Always be surprised by your partner's emotions",
    category: 'romantic',
  },
  {
    id: 'r08',
    a: 'Travel together to 10 new countries',
    b: 'Build a cozy home you both absolutely love',
    category: 'romantic',
  },
  {
    id: 'r09',
    a: 'Share every hobby with your partner',
    b: 'Keep some hobbies just for yourself',
    category: 'romantic',
  },
  {
    id: 'r10',
    a: 'Public displays of affection all the time',
    b: 'Keep your romance private and intimate',
    category: 'romantic',
  },
  {
    id: 'r11',
    a: 'Cook a romantic dinner together at home',
    b: 'Go to a beautiful restaurant for a special occasion',
    category: 'romantic',
  },
  {
    id: 'r12',
    a: 'Have a fairy-tale wedding',
    b: 'Elope somewhere magical just the two of you',
    category: 'romantic',
  },

  // --- spicy ---
  {
    id: 's01',
    a: 'Always know what your partner is thinking',
    b: 'Always be completely mysterious to your partner',
    category: 'spicy',
  },
  {
    id: 's02',
    a: 'Never fight but also never feel passion',
    b: 'Fight sometimes but always make up passionately',
    category: 'spicy',
  },
  {
    id: 's03',
    a: 'Your partner knows your deepest secret',
    b: "You know your partner's deepest secret",
    category: 'spicy',
  },
  {
    id: 's04',
    a: 'Be completely honest about past relationships',
    b: 'Keep the past private and focus on the present',
    category: 'spicy',
  },
  {
    id: 's05',
    a: 'Your partner loves your friends',
    b: 'Your partner loves your family',
    category: 'spicy',
  },
  {
    id: 's06',
    a: 'Always agree on big life decisions',
    b: 'Disagree on some things but respect each other fully',
    category: 'spicy',
  },
  {
    id: 's07',
    a: 'Share all passwords and no privacy',
    b: 'Total privacy and absolute trust',
    category: 'spicy',
  },
  {
    id: 's08',
    a: 'Your partner is your best friend',
    b: 'Your partner is exciting and mysterious to you',
    category: 'spicy',
  },
];

/** Shuffle and pick `n` prompts from the given categories. */
export function pickPrompts(categories: WyrCategory[], count: number, seed: number): WyrPrompt[] {
  const pool =
    categories.length === 0
      ? WYR_PROMPTS
      : WYR_PROMPTS.filter((p) => categories.includes(p.category));
  // Seeded Fisher-Yates so both players see the same order.
  const arr = [...pool];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

export const CATEGORY_LABELS: Record<WyrCategory, { label: string; emoji: string }> = {
  fun: { label: 'Fun', emoji: '🎉' },
  deep: { label: 'Deep', emoji: '🌊' },
  romantic: { label: 'Romantic', emoji: '💕' },
  spicy: { label: 'Spicy', emoji: '🌶️' },
};
