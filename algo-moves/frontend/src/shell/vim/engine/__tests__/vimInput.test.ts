import { describe, it, expect } from 'vitest';
import { createInputMachine, processKey } from '../vimInput';

describe('vimInput', () => {
  it('emits cardinal motion', () => {
    const r = processKey(createInputMachine(), 'j');
    expect(r.type).toBe('motion');
    if (r.type === 'motion') {
      expect(r.motion.kind).toBe('j');
      expect(r.display).toBe('j');
    }
  });

  it('applies count prefix', () => {
    let m = createInputMachine();
    m = processKey(m, '3').type === 'partial' ? (processKey(m, '3') as { machine: typeof m }).machine : m;
    const partial = processKey(createInputMachine(), '3');
    expect(partial.type).toBe('partial');
    if (partial.type === 'partial') {
      const r = processKey(partial.machine, 'j');
      expect(r.type).toBe('motion');
      if (r.type === 'motion') {
        expect(r.motion.count).toBe(3);
        expect(r.display).toBe('3j');
      }
    }
  });

  it('completes fx find motion', () => {
    let m = createInputMachine();
    const f = processKey(m, 'f');
    expect(f.type).toBe('partial');
    if (f.type === 'partial') {
      const r = processKey(f.machine, 'x');
      expect(r.type).toBe('motion');
      if (r.type === 'motion') {
        expect(r.motion.kind).toBe('f');
        expect(r.motion.char).toBe('x');
        expect(r.display).toBe('fx');
      }
    }
  });

  it('parses gg', () => {
    let m = createInputMachine();
    const g1 = processKey(m, 'g');
    expect(g1.type).toBe('partial');
    if (g1.type === 'partial') {
      const r = processKey(g1.machine, 'g');
      expect(r.type).toBe('motion');
      if (r.type === 'motion') {
        expect(r.motion.kind).toBe('gg');
      }
    }
  });

  it('parses nG line jump', () => {
    let m = createInputMachine();
    const p = processKey(m, '4');
    expect(p.type).toBe('partial');
    if (p.type === 'partial') {
      const r = processKey(p.machine, 'G');
      expect(r.type).toBe('motion');
      if (r.type === 'motion') {
        expect(r.motion.kind).toBe('nG');
        expect(r.motion.count).toBe(4);
      }
    }
  });

  it('handles escape reset', () => {
    expect(processKey(createInputMachine(), 'Escape').type).toBe('reset');
  });
});
