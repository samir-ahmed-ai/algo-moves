import type { MotionSpec, VimMotionKind } from './vimMotions';
import { motionDisplay } from './vimMotions';

export interface InputMachine {
  countStr: string;
  pending: 'f' | 'F' | 't' | 'T' | 'g' | null;
}

export type InputAction =
  | { type: 'none' }
  | { type: 'motion'; motion: MotionSpec; display: string }
  | { type: 'reset' }
  | { type: 'restart' }
  | { type: 'hint' }
  | { type: 'partial'; machine: InputMachine };

export function createInputMachine(): InputMachine {
  return { countStr: '', pending: null };
}

function parseCount(countStr: string): number {
  if (!countStr) return 1;
  const n = parseInt(countStr, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function motionFromKind(kind: VimMotionKind, count: number, char?: string): MotionSpec {
  return { kind, count, ...(char !== undefined ? { char } : {}) };
}

function digitKey(key: string): string | null {
  if (key >= '1' && key <= '9') return key;
  if (key === '0') return '0';
  return null;
}

/** Process one key in the Vim input state machine. */
export function processKey(machine: InputMachine, key: string): InputAction {
  if (key === 'Escape') return { type: 'reset' };
  if (key === 'r') return { type: 'restart' };
  if (key === '?') return { type: 'hint' };

  if (machine.pending === 'g') {
    if (key === 'g') {
      const count = parseCount(machine.countStr);
      return {
        type: 'motion',
        motion: motionFromKind('gg', count),
        display: machine.countStr ? `${machine.countStr}gg` : 'gg',
      };
    }
    return { type: 'none' };
  }

  if (machine.pending && ['f', 'F', 't', 'T'].includes(machine.pending)) {
    if (key.length === 1 && key !== ' ') {
      const count = parseCount(machine.countStr);
      const kind = machine.pending;
      return {
        type: 'motion',
        motion: motionFromKind(kind, count, key),
        display: motionDisplay(motionFromKind(kind, count, key)),
      };
    }
    return { type: 'none' };
  }

  const digit = digitKey(key);
  if (digit !== null) {
    if (machine.countStr === '' && digit === '0' && !machine.pending) {
      return {
        type: 'motion',
        motion: motionFromKind('0', 1),
        display: '0',
      };
    }
    return {
      type: 'partial',
      machine: { ...machine, countStr: machine.countStr + digit },
    };
  }

  const count = parseCount(machine.countStr);

  if (key === 'g') {
    return { type: 'partial', machine: { countStr: machine.countStr, pending: 'g' } };
  }

  if (key === 'G') {
    if (machine.countStr) {
      return {
        type: 'motion',
        motion: motionFromKind('nG', count),
        display: `${machine.countStr}G`,
      };
    }
    return {
      type: 'motion',
      motion: motionFromKind('G', 1),
      display: 'G',
    };
  }

  if (key === 'h' || key === 'j' || key === 'k' || key === 'l') {
    return {
      type: 'motion',
      motion: motionFromKind(key, count),
      display: motionDisplay(motionFromKind(key, count)),
    };
  }

  if (key === 'w' || key === 'b' || key === 'e') {
    return {
      type: 'motion',
      motion: motionFromKind(key, count),
      display: motionDisplay(motionFromKind(key, count)),
    };
  }

  if (key === '$') {
    return {
      type: 'motion',
      motion: motionFromKind('$', count),
      display: motionDisplay(motionFromKind('$', count)),
    };
  }

  if (key === '^') {
    return {
      type: 'motion',
      motion: motionFromKind('^', count),
      display: motionDisplay(motionFromKind('^', count)),
    };
  }

  if (key === 'f' || key === 'F' || key === 't' || key === 'T') {
    return {
      type: 'partial',
      machine: { countStr: machine.countStr, pending: key },
    };
  }

  return { type: 'none' };
}

/** Reset machine after a completed motion or cancel. */
export function clearInputMachine(): InputMachine {
  return createInputMachine();
}

export function machineEcho(machine: InputMachine): string {
  if (machine.pending === 'g') return `${machine.countStr}g`;
  if (machine.pending) return `${machine.countStr}${machine.pending}`;
  return machine.countStr;
}
