import { useWorkspace } from '@/store/workspace';
import { TransportBar } from './TransportBarCore';
import { cn } from '@/lib/utils/cn';

/** Collapsible mobile transport — hamburger sheet on narrow viewports. */
export function MobileTransportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tweaks } = useWorkspace();
  if (!open || !tweaks.controls) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-panel p-3 shadow-theme-lg md:hidden',
          'animate-in slide-in-from-bottom duration-200',
        )}
      >
        <TransportBar />
      </div>
    </>
  );
}
