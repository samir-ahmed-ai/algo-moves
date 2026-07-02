export { PadGridBuilder } from './PadGridBuilder';
export { BeatMachineBuilder } from './BeatMachineBuilder';
export { CustomInputBuilder } from './CustomInputBuilder';
export { ArpeggiatorBuilder } from './ArpeggiatorBuilder';
export { PolyrhythmBuilder } from './PolyrhythmBuilder';
export { padGridToArray, createPadGrid } from './padGrid';

import type { InputBuilderKind } from '../../core/effectTypes';
import type { ComponentType } from 'react';
import { PadGridBuilder } from './PadGridBuilder';
import { BeatMachineBuilder } from './BeatMachineBuilder';
import { CustomInputBuilder } from './CustomInputBuilder';
import { ArpeggiatorBuilder } from './ArpeggiatorBuilder';
import { PolyrhythmBuilder } from './PolyrhythmBuilder';

export const INPUT_BUILDERS: Record<
  InputBuilderKind,
  ComponentType<{ onApply: (v: unknown) => void; playheadCol?: number }>
> = {
  pad: PadGridBuilder as ComponentType<{ onApply: (v: unknown) => void; playheadCol?: number }>,
  beat: BeatMachineBuilder as ComponentType<{ onApply: (v: unknown) => void }>,
  custom: CustomInputBuilder,
  arpeggiator: ArpeggiatorBuilder as ComponentType<{ onApply: (v: unknown) => void }>,
  polyrhythm: PolyrhythmBuilder as ComponentType<{ onApply: (v: unknown) => void }>,
};
