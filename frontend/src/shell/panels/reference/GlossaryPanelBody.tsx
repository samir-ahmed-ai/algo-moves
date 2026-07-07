import { useState } from 'react';
import { BookMarked } from 'lucide-react';
import { GLOSSARY } from '../../../content';

import {
  useCanvasStatic,
  ControlsAccordion,
  DefRow,
  EmptyState,
  SearchInput,
} from '@/shell/canvas';
/** #65 Glossary with terms relevant to the current problem surfaced first. */
export function GlossaryPanelBody() {
  const { item } = useCanvasStatic();
  const [q, setQ] = useState('');
  const tagSet = new Set(item.tags);
  const filtered = GLOSSARY.filter(
    (t) =>
      !q ||
      t.term.toLowerCase().includes(q.toLowerCase()) ||
      t.def.toLowerCase().includes(q.toLowerCase()),
  );
  const relevant = filtered.filter((t) => t.tags?.some((tag) => tagSet.has(tag)));
  const rest = filtered.filter((t) => !t.tags?.some((tag) => tagSet.has(tag)));
  return (
    <div className="reference-panel reference-panel--glossary nodrag flex flex-col gap-2">
      <SearchInput value={q} onChange={setQ} placeholder="search terms…" />
      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="h-5 w-5" />}
          title="No matches"
          hint="Try another term."
        />
      ) : (
        <>
          {relevant.length > 0 && (
            <ControlsAccordion title="This problem" className="border-t-0">
              <div className="reference-panel__stack flex flex-col">
                {relevant.map((t) => (
                  <DefRow key={t.term} term={t.term}>
                    {t.def}
                  </DefRow>
                ))}
              </div>
            </ControlsAccordion>
          )}
          <ControlsAccordion title="All terms" defaultOpen={!q}>
            <div className="reference-panel__stack flex flex-col">
              {rest.map((t) => (
                <DefRow key={t.term} term={t.term}>
                  {t.def}
                </DefRow>
              ))}
            </div>
          </ControlsAccordion>
        </>
      )}
    </div>
  );
}
