import { VimCallout } from './vimUi';

import { useVimGame } from '../canvas/VimGameProvider';
export function LessonSection() {
  const { level } = useVimGame();

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink3">Lesson</p>
      <VimCallout>{level.objective}</VimCallout>
      <p className="mt-2 line-clamp-3 text-[11px] leading-snug text-ink2">{level.lesson}</p>
    </div>
  );
}
