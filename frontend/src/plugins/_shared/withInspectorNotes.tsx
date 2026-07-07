import type { ComponentType } from 'react';
import type { InspectorProps } from '../../core/types';
import { VarGrid, CollapsibleDetails } from './vizKit';

export type InspectorNoteSection = {
  title: string;
  body: string;
};

/**
 * Wrap any simulator Inspector with optional notes/approaches sections
 * below the per-frame variable grid.
 */
export function withInspectorNotes<S>(
  Inspector: ComponentType<InspectorProps<S>>,
  sections: InspectorNoteSection[],
): ComponentType<InspectorProps<S>> {
  const visible = sections.filter((s) => s.body.trim().length > 0);
  if (visible.length === 0) return Inspector;

  return function InspectorWithNotes(props: InspectorProps<S>) {
    return (
      <>
        <Inspector {...props} />
        <VarGrid>
          {visible.map((s) => (
            <CollapsibleDetails key={s.title} title={s.title} body={s.body} />
          ))}
        </VarGrid>
      </>
    );
  };
}
