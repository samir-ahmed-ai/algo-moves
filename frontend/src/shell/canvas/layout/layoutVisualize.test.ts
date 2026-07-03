import { describe, expect, it } from 'vitest';
import type { PanelFlowNode, PanelNodeData } from '../nodes/PanelNode';
import { CANVAS_MARGIN, layoutSize, layoutVisualizeCanvas } from './layout';
import { vizMinWidth, vizWireGap } from '../ui/canvasTokens';

function panel(
  kind: string,
  overrides: Partial<PanelFlowNode> = {},
): PanelFlowNode {
  return {
    id: kind,
    type: 'panel',
    position: { x: 0, y: 0 },
    width: 400,
    height: kind === 'viz' ? 600 : kind === 'problem' ? 180 : 100,
    data: { kind, title: kind } as PanelNodeData,
    ...overrides,
  } as PanelFlowNode;
}

function expectCenteredAgainstViz(laid: PanelFlowNode[], colH: number, problem?: PanelFlowNode) {
  const viz = laid.find((n) => n.data.kind === 'viz');
  expect(viz).toBeDefined();

  const vizY = viz!.position.y;
  const vizH = viz!.height ?? 0;
  const stackY = vizY + Math.max(0, (vizH - colH) / 2);

  if (problem) {
    expect(problem.position.y).toBeCloseTo(stackY, 0);
  }

  const colMid = stackY + colH / 2;
  expect(colMid).toBeCloseTo(vizY + vizH / 2, 0);
}

describe('layoutVisualizeCanvas', () => {
  it('centers the unified problem panel against the visualizer', () => {
    const nodes = [
      panel('problem', { height: 256 }),
      panel('viz', { height: 640, width: 720 }),
    ];
    const viewport = { width: 1200, height: 800 };
    const laid = layoutVisualizeCanvas(nodes, { viewport });

    const problem = laid.find((n) => n.data.kind === 'problem')!;

    expect(problem.height).toBe(256);
    expectCenteredAgainstViz(laid, 256, problem);
  });

  it('centers a lone problem panel against the visualizer', () => {
    const nodes = [panel('problem', { height: 200 }), panel('viz', { height: 500, width: 720 })];
    const laid = layoutVisualizeCanvas(nodes, { viewport: { width: 1200, height: 700 } });
    const problem = laid.find((n) => n.data.kind === 'problem')!;

    expectCenteredAgainstViz(laid, 200, problem);
  });

  it('re-centers the left column when problem height changes without viewport', () => {
    const viewport = { width: 1200, height: 800 };
    const initial = layoutVisualizeCanvas(
      [panel('problem', { height: 160 }), panel('viz')],
      { viewport },
    );
    const viz = initial.find((n) => n.data.kind === 'viz')!;
    const tallerProblem = layoutVisualizeCanvas(
      [
        panel('problem', { height: 240, position: initial.find((n) => n.data.kind === 'problem')!.position }),
        { ...viz, height: viz.height, width: viz.width },
      ],
    );
    const problem = tallerProblem.find((n) => n.data.kind === 'problem')!;

    expectCenteredAgainstViz(tallerProblem, 240, problem);
  });

  it('hugs the visualizer to its content height and centers it in the viewport', () => {
    const nodes = [panel('problem'), panel('viz', { height: 320 })];
    const availH = 800 - CANVAS_MARGIN * 2;
    const laid = layoutVisualizeCanvas(nodes, { viewport: { width: 1200, height: 800 } });
    const viz = laid.find((n) => n.data.kind === 'viz')!;

    expect(viz.height).toBe(320);
    expect(viz.position.y).toBeCloseTo(CANVAS_MARGIN + (availH - 320) / 2, 0);
  });

  it('expands the visualizer to fill remaining viewport width', () => {
    const viewport = { width: 1200, height: 800 };
    const laid = layoutVisualizeCanvas(
      [panel('problem'), panel('viz', { width: 400 })],
      { viewport },
    );
    const viz = laid.find((n) => n.data.kind === 'viz')!;
    const colW = layoutSize('problem', viewport).w;
    const wireGap = vizWireGap(colW);
    const availW = Math.max(vizMinWidth(colW), viewport.width - CANVAS_MARGIN * 2 - colW - wireGap);

    expect(viz.width).toBe(availW);
  });
});
