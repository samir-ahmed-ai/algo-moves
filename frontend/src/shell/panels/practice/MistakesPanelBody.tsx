import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useProgress, clearMistakes } from '@/store/persistence';

import {
  useCanvasStatic,
  Banner,
  Btn,
  EmptyState,
  Pill,
  Section,
  Stat,
  StatGrid,
  nodeText,
} from '@/shell/canvas';
/** #55 Mistake log: wrong predictions collected for review. */
export function MistakesPanelBody() {
  const { item } = useCanvasStatic();
  const progress = useProgress();
  const mine = progress.mistakes.filter((m) => m.problemId === item.id);
  if (mine.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-5 w-5" />}
        title="No mistakes logged"
        hint="Wrong answers in Predict land here for review."
      />
    );
  }
  return (
    <div className="nodrag flex flex-col">
      <Section
        title="Wrong predictions"
        bordered={false}
        right={
          <div className="flex items-center gap-2">
            <Pill tone="bad">{mine.length}</Pill>
            {progress.mistakes.length > 0 && (
              <Btn variant="danger" size="xs" onClick={clearMistakes}>
                Clear
              </Btn>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-1.5">
          {mine.map((m) => (
            <Banner key={m.id} tone="bad" label="Wrong prediction">
              <div className={cn('leading-snug', nodeText.base)}>{m.prompt}</div>
              <div className="mt-1">
                <StatGrid cols={2}>
                  <Stat k="you" v={m.picked} tone="bad" />
                  <Stat k="right" v={m.answer} tone="good" />
                </StatGrid>
              </div>
            </Banner>
          ))}
        </div>
      </Section>
    </div>
  );
}
