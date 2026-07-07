import { VimCallout } from './vimUi';

import { useVimGame } from '../canvas/VimGameProvider';
export function LessonSection() {
  const { level } = useVimGame();

  return (
    <div>
      <p className="mb-1.5 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">Lesson</p>
      <VimCallout>{level.objective}</VimCallout>
      <p className="mt-2 line-clamp-3 text-[length:var(--fs-tight)] leading-snug text-ink2">{level.lesson}</p>
    </div>
  );
}
