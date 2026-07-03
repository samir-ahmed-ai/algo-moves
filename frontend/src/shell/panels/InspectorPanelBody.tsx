import { ScanSearch } from 'lucide-react';
import { useCanvasFrame, useCanvasStatic } from '../canvas/CanvasContext';
import { ControlsAccordion, EmptyState, Pill } from '../canvas/nodeui';
import { MetricsBody } from './MetricsPanelBody';

export function InspectorPaneContent() {
  const { plugin } = useCanvasStatic();
  const { frame } = useCanvasFrame();
  const { selectedNode } = useCanvasStatic();
  const Inspector = plugin.Inspector;
  if (!Inspector) {
    return (
      <EmptyState
        icon={<ScanSearch className="h-5 w-5" />}
        title="No inspector"
        hint="This problem exposes no element details."
      />
    );
  }
  return <Inspector frame={frame} selectedNode={selectedNode} />;
}

/** Merged Inspector + Metrics as collapsible sections (standalone pop-out panel). */
export function InspectorPanelBody() {
  const { selectedNode } = useCanvasStatic();
  return (
    <div className="flex flex-col">
      <ControlsAccordion
        title="Inspector"
        className="border-t-0"
        right={selectedNode != null ? <Pill active>node {selectedNode}</Pill> : undefined}
      >
        <InspectorPaneContent />
      </ControlsAccordion>
      <ControlsAccordion title="Metrics" defaultOpen={false}>
        <MetricsBody />
      </ControlsAccordion>
    </div>
  );
}
