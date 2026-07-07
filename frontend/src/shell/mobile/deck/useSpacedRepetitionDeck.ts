/**
 * Orders mobile deck blocks by spaced-repetition due dates (overdue → unseen → future).
 */
import { useEffect, useState } from 'react';
import type { Topic } from '@/content';
import { buildDeck, type MobileDeck, type ProblemBlock } from './deckModel';
import { srsSortKey, useSrsData, type SrsCard } from '@/store/persistence/srs';

function orderBlocks(blocks: ProblemBlock[], cards: Record<string, SrsCard>): ProblemBlock[] {
  return [...blocks].sort((a, b) => {
    const ka = srsSortKey(a.item.id, cards);
    const kb = srsSortKey(b.item.id, cards);
    if (ka !== kb) return ka - kb;
    return a.item.title.localeCompare(b.item.title);
  });
}

export function useSpacedRepetitionDeck(topic: Topic): {
  deck: MobileDeck;
  loading: boolean;
} {
  const srs = useSrsData();
  const [deck, setDeck] = useState<MobileDeck>(() => ({ topic, blocks: [], totalQuiz: 0 }));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    buildDeck(topic).then((built) => {
      if (cancelled) return;
      const blocks = orderBlocks(built.blocks, srs.cards);
      setDeck({ ...built, blocks });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [topic, srs.cards]);

  return { deck, loading };
}
