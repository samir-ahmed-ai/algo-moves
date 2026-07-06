import { useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { ResizablePanels } from '@/components/shared/ResizablePanels';
import {
  OVERVIEW_PROBLEM_CONCEPT_DEFAULT,
  OVERVIEW_PROBLEM_CONCEPT_MAX,
  OVERVIEW_PROBLEM_DEFAULT,
  OVERVIEW_PROBLEM_MAX,
  OVERVIEW_PROBLEM_MIN,
  OVERVIEW_TOP_DEFAULT,
  OVERVIEW_TOP_MAX,
  OVERVIEW_TOP_MIN,
  OVERVIEW_VIZ_DEFAULT,
  OVERVIEW_VIZ_MAX,
  OVERVIEW_VIZ_MIN,
} from '@/lib/editor/resizeSplit';
import { useOverviewLayoutPrefs } from '@/store/user-prefs/overviewLayoutPrefs';
import { conceptOverviewProblemPct, isConceptCourse } from '@/lib/canvas/conceptCourse';
import { ProblemPanelBody } from './ProblemPanelBody';
import { VizPanelBody } from '../visualize/VizPanelBody';
import { useCodeStudioContent } from '@/shell/study/CodeStudio';
import { RecallPane } from '@/shell/study/components/RecallPane';

import { useCanvasFrame, TransportBar, useCanvasStatic } from '@/shell/canvas';

function ProblemAside({ className }: { className?: string }) {
  return (
    <aside className={cn('ws-scroll h-full overflow-y-auto bg-panel/40', className)}>
      <div className="p-3 sm:p-4">
        <div className="rounded-[var(--radius)] border border-edge bg-panel p-3 sm:p-4">
          <ProblemPanelBody />
        </div>
      </div>
    </aside>
  );
}

function VizMain({ verticalTransport }: { verticalTransport: boolean }) {
  return (
    <main
      className={cn(
        'flex min-h-0 min-w-0 flex-1 overflow-hidden',
        verticalTransport ? 'flex-col' : 'flex-row',
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <VizPanelBody showTransport={false} />
      </div>
      <aside
        className={cn(
          'flex shrink-0 border-edge bg-panel/80 backdrop-blur',
          verticalTransport
            ? 'justify-center border-t px-3 py-2'
            : 'flex-col items-center border-l',
        )}
      >
        <TransportBar
          vertical={!verticalTransport}
          className={verticalTransport ? undefined : 'border-0 bg-transparent shadow-none'}
        />
      </aside>
    </main>
  );
}

/** Learn Overview tab — problem statement beside the live animation board. */
export function ProblemOverviewBody() {
  const isMobile = useIsMobile();
  const { player } = useCanvasFrame();
  const { item } = useCanvasStatic();
  const conceptCourse = isConceptCourse(item);
  const { reference } = useCodeStudioContent();
  const [layout, setLayout] = useOverviewLayoutPrefs();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          player.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          player.prev();
          break;
        case ' ':
          e.preventDefault();
          player.togglePlay();
          break;
        case 'Home':
          e.preventDefault();
          player.goTo(0);
          break;
        case 'End':
          e.preventDefault();
          player.goTo(player.total - 1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player.next, player.prev, player.togglePlay, player.goTo, player.total]);

  const problemSplit = conceptCourse ? conceptOverviewProblemPct(layout.problemPct) : layout.problemPct;

  const topSection = (
    <ResizablePanels
      direction="horizontal"
      splitPct={problemSplit}
      onSplitPctChange={(problemPct) => setLayout({ problemPct })}
      minPct={OVERVIEW_PROBLEM_MIN}
      maxPct={conceptCourse ? OVERVIEW_PROBLEM_CONCEPT_MAX : OVERVIEW_PROBLEM_MAX}
      defaultPct={conceptCourse ? OVERVIEW_PROBLEM_CONCEPT_DEFAULT : OVERVIEW_PROBLEM_DEFAULT}
      disabled={isMobile}
      className="min-h-0 flex-1"
      first={<ProblemAside className={isMobile ? 'max-h-[40vh]' : undefined} />}
      second={
        conceptCourse ? (
          <VizMain verticalTransport />
        ) : (
          <ResizablePanels
            direction="horizontal"
            splitPct={layout.vizPct}
            onSplitPctChange={(vizPct) => setLayout({ vizPct })}
            minPct={OVERVIEW_VIZ_MIN}
            maxPct={OVERVIEW_VIZ_MAX}
            defaultPct={OVERVIEW_VIZ_DEFAULT}
            disabled={isMobile}
            className="min-h-0 flex-1"
            first={
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <VizPanelBody showTransport={false} />
              </div>
            }
            second={
              <aside className="flex h-full shrink-0 flex-col items-center border-l border-edge bg-panel/80 backdrop-blur">
                <TransportBar vertical className="border-0 bg-transparent shadow-none" />
              </aside>
            }
          />
        )
      }
    />
  );

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ProblemAside className="max-h-[40vh] shrink-0 border-b border-edge" />
          <VizMain verticalTransport />
        </div>
        {reference && (
          <section className="flex min-h-[min(42vh,400px)] shrink-0 flex-col overflow-hidden border-t border-edge bg-panel/40">
            <RecallPane className="min-h-0 flex-1" showTitle />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {reference ? (
        <ResizablePanels
          direction="vertical"
          splitPct={layout.recallTopPct}
          onSplitPctChange={(recallTopPct) => setLayout({ recallTopPct })}
          minPct={OVERVIEW_TOP_MIN}
          maxPct={OVERVIEW_TOP_MAX}
          defaultPct={OVERVIEW_TOP_DEFAULT}
          className="min-h-0 flex-1"
          first={topSection}
          second={
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-panel/40">
              <RecallPane className="min-h-0 flex-1" showTitle />
            </section>
          }
        />
      ) : (
        topSection
      )}
    </div>
  );
}
