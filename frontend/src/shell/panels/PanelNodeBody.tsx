import {
  CodeStudioProvider,
  CodeStudioBody,
  CodeStudioFooter,
  CodeStudioToolbar,
} from '@/shell/study/CodeStudio';
import { CollabCodeStudioBody, CollabCodeStudioToolbar } from '@/shell/study/CollabCodeStudio';
import { SubDocSyncProvider } from '@/shell/canvas';
import { PanelBody as PanelBodyShell } from '@/shell/canvas/ui/nodeui';
import type { PanelNodeBodyProps } from '@/core/panelNodeBodyTypes';
import { PanelBody } from './PanelBodyRouter';
import { PanelNodeHeader } from './PanelNodeHeader';
import { HeaderExamplesNav } from './PanelHeaderControls';
import { VizPanelBody } from './visualize/VizPanelBody';
import { WorkbenchPanelBody } from './workbench';
import { LayoutHostFrame } from '@/shell/canvas/ui/LayoutHostFrame';

export type { PanelNodeBodyProps } from '@/core/panelNodeBodyTypes';

export function PanelNodeBody({
  data,
  headerProps,
  headerDensity,
  flushBody,
  vizCanvas,
  boardCanvas,
  narrowBody,
  bodyCap,
  showBigO,
  onBigOOpenChange,
  collapsed,
  layoutHostMode,
}: PanelNodeBodyProps) {
  if (collapsed) {
    return <PanelNodeHeader {...headerProps} />;
  }

  if (layoutHostMode) {
    return (
      <>
        <PanelNodeHeader {...headerProps} />
        <LayoutHostFrame
          hostId={headerProps.id}
          {...(data.layoutSlots !== undefined ? { slots: data.layoutSlots } : {})}
        />
      </>
    );
  }

  const isViz = data.kind === 'viz';
  const isReassemble = data.kind === 'reassemble';
  const isRecall = data.kind === 'recall';
  const isCode = data.kind === 'code' || data.kind === 'scratch' || isReassemble || isRecall;
  const isCollabCode = data.kind === 'collab-code';
  const isProblem = data.kind === 'problem';
  const isWorkbench = data.kind === 'workbench';

  if (isWorkbench) {
    return (
      <CodeStudioProvider>
        <PanelNodeHeader
          {...headerProps}
          inlineToolbar={
            <div className="panel-inline-toolbar panel-inline-toolbar--examples nodrag flex min-w-0 flex-1 items-center gap-1">
              <HeaderExamplesNav />
            </div>
          }
        />
        <WorkbenchPanelBody showBigO={showBigO} onBigOOpenChange={onBigOOpenChange} />
      </CodeStudioProvider>
    );
  }

  if (isCode) {
    return (
      <CodeStudioProvider
        {...(isReassemble
          ? { phaseLock: 'reassemble' as const }
          : isRecall
            ? { phaseLock: 'recall' as const }
            : {})}
      >
        <PanelNodeHeader
          {...headerProps}
          inlineToolbar={
            <div className="panel-inline-toolbar panel-inline-toolbar--code nodrag flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
              <CodeStudioToolbar />
            </div>
          }
        />
        <div className="panel-code-body nowheel flex min-h-0 flex-1 flex-col overflow-hidden">
          <CodeStudioBody />
        </div>
        <CodeStudioFooter />
      </CodeStudioProvider>
    );
  }

  if (isCollabCode) {
    return (
      <SubDocSyncProvider kind="collab-code">
        <PanelNodeHeader
          {...headerProps}
          inlineToolbar={
            <div className="panel-inline-toolbar panel-inline-toolbar--collab-code nodrag flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
              <CollabCodeStudioToolbar />
            </div>
          }
        />
        <CollabCodeStudioBody />
      </SubDocSyncProvider>
    );
  }

  const body = (
    <>
      <PanelNodeHeader
        {...headerProps}
        inlineToolbar={
          isProblem && !collapsed ? (
            <div className="panel-inline-toolbar panel-inline-toolbar--problem nodrag flex shrink-0 items-center gap-0.5">
              <HeaderExamplesNav />
            </div>
          ) : undefined
        }
      />

      {!collapsed && (
        <PanelBodyShell
          density={headerDensity}
          fill={isViz && !vizCanvas}
          flush={flushBody || boardCanvas}
          narrow={narrowBody}
          {...(!isViz && bodyCap ? { style: { maxWidth: bodyCap } } : {})}
        >
          {isViz ? (
            <VizPanelBody
              nodeId={headerProps.id}
              showBigO={showBigO}
              onBigOOpenChange={onBigOOpenChange}
            />
          ) : (
            <PanelBody kind={data.kind} />
          )}
        </PanelBodyShell>
      )}
    </>
  );

  if (data.kind === 'notes') {
    return <SubDocSyncProvider kind="notes">{body}</SubDocSyncProvider>;
  }

  return body;
}
