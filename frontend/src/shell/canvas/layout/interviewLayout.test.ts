import { describe, expect, it } from 'vitest';
import { buildInterviewBoardNodes, mergeInterviewNodes } from './interviewLayout';
import type { PanelFlowNode } from '@/shell/panels/panelTypes';

describe('interviewLayout', () => {
  describe('buildInterviewBoardNodes', () => {
    it('builds whiteboard + code by default', () => {
      const nodes = buildInterviewBoardNodes(false);
      const kinds = nodes.map((n) => n.data.kind);
      expect(kinds).toContain('whiteboard');
      expect(kinds).toContain('collab-code');
      expect(kinds).not.toContain('notes');
    });

    it('includes notes when requested', () => {
      const nodes = buildInterviewBoardNodes(true);
      const kinds = nodes.map((n) => n.data.kind);
      expect(kinds).toContain('notes');
    });

    it('includes problem panel when options specify it', () => {
      const nodes = buildInterviewBoardNodes({ includeProblem: true, includeNotes: false });
      const kinds = nodes.map((n) => n.data.kind);
      expect(kinds).toContain('problem');
      expect(kinds).not.toContain('notes');
    });
  });

  describe('mergeInterviewNodes', () => {
    it('adds only kinds not already present', () => {
      const existing: PanelFlowNode[] = [
        { id: 'wb-1', type: 'panel', position: { x: 0, y: 0 }, data: { kind: 'whiteboard', title: 'Whiteboard', runState: 'paused' } },
      ];
      const incoming = buildInterviewBoardNodes({ includeNotes: true, includeProblem: false });
      const merged = mergeInterviewNodes(existing, incoming);

      const kinds = merged.map((n) => n.data.kind);
      expect(kinds.filter((k) => k === 'whiteboard')).toHaveLength(1);
      expect(kinds).toContain('collab-code');
      expect(kinds).toContain('notes');
      expect(merged).toHaveLength(3);
    });

    it('preserves existing nodes and adds missing ones', () => {
      const existing: PanelFlowNode[] = [
        { id: 'custom-1', type: 'panel', position: { x: 10, y: 10 }, data: { kind: 'viz', title: 'Viz', runState: 'paused' } },
      ];
      const incoming = buildInterviewBoardNodes(false);
      const merged = mergeInterviewNodes(existing, incoming);

      expect(merged[0].id).toBe('custom-1');
      const newKinds = merged.slice(1).map((n) => n.data.kind);
      expect(newKinds).toContain('whiteboard');
      expect(newKinds).toContain('collab-code');
    });

    it('returns same array when all kinds already exist', () => {
      const existing: PanelFlowNode[] = [
        { id: 'wb-1', type: 'panel', position: { x: 0, y: 0 }, data: { kind: 'whiteboard', title: 'WB', runState: 'paused' } },
        { id: 'cc-1', type: 'panel', position: { x: 0, y: 0 }, data: { kind: 'collab-code', title: 'CC', runState: 'paused' } },
      ];
      const incoming = buildInterviewBoardNodes(false);
      const merged = mergeInterviewNodes(existing, incoming);
      expect(merged).toHaveLength(2);
    });
  });
});
