import { describe, expect, it } from 'vitest';
import type { PanelFlowNode, PanelNodeData } from './PanelNode';
import { CANVAS_MARGIN, CANVAS_NODE_SEP, layoutVisualizeCanvas } from './layout';

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

function expectCenteredAgainstViz(
  laid: PanelFlowNode[],
  colH: number,
  problem?: PanelFlowNode,
  examples?: PanelFlowNode,
) {
  const viz = laid.find((n) => n.data.kind === 'viz');
  expect(viz).toBeDefined();

  const vizY = viz!.position.y;
  const vizH = viz!.height ?? 0;
  const stackY = vizY + Math.max(0, (vizH - colH) / 2);

  if (problem) {
    expect(problem.position.y).toBeCloseTo(stackY, 0);
  }
  if (examples && problem) {
    expect(examples.position.y).toBeCloseTo(
      problem.position.y + (problem.height ?? 0) + CANVAS_NODE_SEP,
      0,
    );
  } else if (examples) {
    expect(examples.position.y).toBeCloseTo(stackY, 0);
  }

  const colMid = stackY + colH / 2;
  expect(colMid).toBeCloseTo(vizY + vizH / 2, 0);
}

describe('layoutVisualizeCanvas', () => {
  it('stacks problem and examples centered against the visualizer', () => {
    const nodes = [
      panel('problem', { height: 160 }),
      panel('examples', { height: 96 }),
      panel('viz', { height: 640, width: 720 }),
    ];
    const viewport = { width: 1200, height: 800 };
    const laid = layoutVisualizeCanvas(nodes, { viewport });

    const problem = laid.find((n) => n.data.kind === 'problem')!;
    const examples = laid.find((n) => n.data.kind === 'examples')!;
    const colH = 160 + CANVAS_NODE_SEP + 96;

    expect(problem.height).toBe(160);
    expectCenteredAgainstViz(laid, colH, problem, examples);
  });

  it('centers a lone problem panel against the visualizer', () => {
    const nodes = [panel('problem', { height: 200 }), panel('viz', { height: 500, width: 720 })];
    const laid = layoutVisualizeCanvas(nodes, { viewport: { width: 1200, height: 700 } });
    const problem = laid.find((n) => n.data.kind === 'problem')!;

    expectCenteredAgainstViz(laid, 200, problem);
  });

  it('centers a lone examples panel against the visualizer', () => {
    const nodes = [panel('examples', { height: 120 }), panel('viz', { height: 500, width: 720 })];
    const laid = layoutVisualizeCanvas(nodes, { viewport: { width: 1200, height: 700 } });
    const examples = laid.find((n) => n.data.kind === 'examples')!;

    expectCenteredAgainstViz(laid, 120, undefined, examples);
  });

  it('re-centers the left column when problem height changes without viewport', () => {
    const viewport = { width: 1200, height: 800 };
    const initial = layoutVisualizeCanvas(
      [panel('problem', { height: 160 }), panel('examples', { height: 96 }), panel('viz')],
      { viewport },
    );
    const viz = initial.find((n) => n.data.kind === 'viz')!;
    const tallerProblem = layoutVisualizeCanvas(
      [
        panel('problem', { height: 240, position: initial.find((n) => n.data.kind === 'problem')!.position }),
        panel('examples', { height: 96 }),
        { ...viz, height: viz.height, width: viz.width },
      ],
    );
    const problem = tallerProblem.find((n) => n.data.kind === 'problem')!;
    const examples = tallerProblem.find((n) => n.data.kind === 'examples')!;

    expectCenteredAgainstViz(tallerProblem, 240 + CANVAS_NODE_SEP + 96, problem, examples);
  });

  it('top-aligns the visualizer to the canvas margin', () => {
    const laid = layoutVisualizeCanvas(
      [panel('problem'), panel('examples'), panel('viz')],
      { viewport: { width: 1200, height: 800 } },
    );
    const viz = laid.find((n) => n.data.kind === 'viz')!;

    expect(viz.position.y).toBe(CANVAS_MARGIN);
    expect(viz.height).toBe(800 - CANVAS_MARGIN * 2);
  });
});
