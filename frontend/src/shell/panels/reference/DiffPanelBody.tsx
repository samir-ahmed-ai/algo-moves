import { GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { JsonBlock } from '@/components/code/JsonBlock';

import { useCanvasFrame, Banner, ControlsAccordion, EmptyState, Pill, nodeText } from '@/shell/canvas';
/** #20 Frame diff: which parts of the state changed this step. */
export function DiffPanelBody() {
  const { frames, player } = useCanvasFrame();
  const i = player.index;
  const cur = (frames[i]?.state ?? {}) as Record<string, unknown>;
  const prev = i > 0 ? ((frames[i - 1]?.state ?? {}) as Record<string, unknown>) : null;
  const changed = prev ? Object.keys(cur).filter((k) => JSON.stringify(cur[k]) !== JSON.stringify(prev[k])) : [];
  return (
    <div className="flex flex-col">
      <ControlsAccordion title="This step" className="border-t-0">
        <div className={cn('font-mono leading-snug text-ink', nodeText.base)}>{frames[i]?.move.note}</div>
      </ControlsAccordion>
      {i === 0 ? (
        <EmptyState icon={<GitCompare className="h-5 w-5" />} title="First frame" hint="Nothing to compare against yet." />
      ) : changed.length === 0 ? (
        <EmptyState icon={<GitCompare className="h-5 w-5" />} title="Nothing changed" hint="This step mutated no state fields." />
      ) : (
        <ControlsAccordion title="Changed fields" right={<Pill>{changed.length}</Pill>}>
          <div className="flex flex-col gap-1.5">
            {changed.map((k) => (
              <Banner key={k} tone="accent" label={k}>
                <div className="flex flex-col gap-1.5">
                  <div>
                    <p className={cn('mb-0.5 text-bad', nodeText.xs)}>Before</p>
                    <JsonBlock value={prev![k]} size="xs" variant="nested" maxHeight="120px" />
                  </div>
                  <div>
                    <p className={cn('mb-0.5 text-good', nodeText.xs)}>After</p>
                    <JsonBlock value={cur[k]} size="xs" variant="nested" maxHeight="120px" />
                  </div>
                </div>
              </Banner>
            ))}
          </div>
        </ControlsAccordion>
      )}
    </div>
  );
}
