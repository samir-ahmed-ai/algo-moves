import { type ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';
import { patternsForTags } from '../../../../content';
import { cn } from '../../../../lib/cn';
import { useCanvasStatic } from '../../CanvasContext';
import { Banner, Chip, EmptyState, Label, Section, nodeText } from '../../nodeui';

function PatField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className={cn('mt-0.5 leading-snug text-ink2', nodeText.base)}>{children}</p>
    </div>
  );
}

/** #64/#69/#70 Pattern cards for the current problem's tags. */
export function PatternPanelBody() {
  const { item } = useCanvasStatic();
  const cards = patternsForTags(item.tags);
  if (cards.length === 0) {
    return (
      <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="No pattern yet" hint="This problem's tags have no pattern card." />
    );
  }
  return (
    <div className="flex flex-col">
      {cards.map((c, idx) => (
        <Section
          key={c.id}
          title={c.title}
          collapsible
          defaultOpen={idx === 0}
          right={<Chip mono>{c.complexity.split('|')[0].trim()}</Chip>}
        >
          <div className="flex flex-col gap-2">
            <PatField label="Intuition">{c.idea}</PatField>
            <PatField label="When to use">{c.whenToUse}</PatField>
            <PatField label="Complexity">{c.complexity}</PatField>
            {c.tradeoff && <PatField label="Brute force vs optimal">{c.tradeoff}</PatField>}
            <PatField label="Real-world">{c.realWorld}</PatField>
            {c.pitfall && <Banner tone="bad" label="Common pitfall">{c.pitfall}</Banner>}
            <Banner tone="accent" label="Interview tip">{c.interviewTip}</Banner>
          </div>
        </Section>
      ))}
    </div>
  );
}
