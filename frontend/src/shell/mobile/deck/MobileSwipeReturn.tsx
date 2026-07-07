import { Smartphone } from 'lucide-react';
import { categoryIdFromBrowseTopic } from '../../../content';
import { useWorkspace } from '@/store/workspace';
import { loadMobileSession } from '../mobileSession';

/** Compact return link when the canvas workspace is open on a phone-sized viewport. */
export function MobileSwipeReturn() {
  const { isMobile, enterMobile } = useWorkspace();
  if (!isMobile) return null;

  const session = loadMobileSession();
  const categoryId = session?.topicId ? categoryIdFromBrowseTopic(session.topicId) : undefined;
  return (
    <button
      type="button"
      onClick={() => enterMobile(categoryId)}
      aria-label="Return to swipe practice"
      className="fixed bottom-[calc(var(--chrome-bottom,0px)+3.5rem)] left-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-edge bg-[var(--surface-glass)] px-3 py-2 text-[length:var(--fs-xs)] font-semibold text-ink shadow-theme-md backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-theme-lg md:hidden"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
        <Smartphone className="h-3.5 w-3.5" />
      </span>
      Swipe mode
    </button>
  );
}
