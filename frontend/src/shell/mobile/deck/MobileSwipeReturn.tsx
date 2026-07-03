import { Smartphone } from 'lucide-react';
import { categoryIdFromBrowseTopic } from '../../content';
import { useWorkspace } from '@/store/workspace';
import { loadMobileSession } from './mobileSession';

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
      className="fixed bottom-[calc(var(--chrome-bottom,0px)+3.5rem)] left-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel/95 px-3 py-2 text-[12px] font-medium text-ink shadow-[var(--shadow-md)] backdrop-blur md:hidden"
    >
      <Smartphone className="h-3.5 w-3.5 text-accent" />
      Swipe mode
    </button>
  );
}
