import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { patternsForTags } from '../../../content';

import { useCanvasStatic, Banner, Btn, ControlsAccordion, EmptyState, Hint, Meter } from '@/shell/canvas';
/** #40 Hint ladder: reveal progressively deeper hints. */
export function HintsPanelBody() {
  const { item } = useCanvasStatic();
  const cards = patternsForTags(item.tags);
  const hints = [item.summary, ...cards.flatMap((c) => [c.idea, c.whenToUse, c.complexity])].filter(Boolean) as string[];
  const [shown, setShown] = useState(1);
  if (hints.length === 0) {
    return (
      <EmptyState icon={<Lightbulb className="h-5 w-5" />} title="No hints yet" hint="This problem's tags have no hint cards." />
    );
  }
  return (
    <div className="nodrag flex flex-col gap-2">
      <ControlsAccordion
        title="Hint ladder"
        className="border-t-0"
        right={
          <div className="w-16">
            <Meter value={shown} max={hints.length} tone="accent" height={4} />
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          {hints.slice(0, shown).map((h, i) => (
            <Banner key={i} tone="accent" label={`Hint ${i + 1}`}>
              {h}
            </Banner>
          ))}
        </div>
      </ControlsAccordion>
      {shown < hints.length ? (
        <Btn variant="primary" size="sm" onClick={() => setShown((s) => s + 1)} className="self-start">
          Reveal next ({shown}/{hints.length})
        </Btn>
      ) : (
        <Hint>All {hints.length} hints revealed.</Hint>
      )}
    </div>
  );
}
