import { useState } from 'react';
import { UserCheck, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../../chromeUi';
import { RADIUS_CTRL, RADIUS_SHELL } from '../../ui/nodeui';
import { useInterviewGuestGate } from './useInterviewGuestGate';

/**
 * Full-screen overlay shown to a candidate opening an interview invite link:
 * collects a display name before joining, or explains that the interview is
 * closed. Renders nothing for hosts / non-interview links / after joining.
 */
export function GuestNameGate() {
  const gate = useInterviewGuestGate();
  const [name, setName] = useState('');

  if (gate.phase === 'inactive' || gate.phase === 'loading') return null;

  return (
    <div className="absolute inset-0 z-[60] grid place-items-center bg-bg/70 backdrop-blur-sm">
      <div className={cn('flex w-[min(92vw,340px)] flex-col gap-3 border border-edge bg-panel p-5 shadow-xl', RADIUS_SHELL)}>
        {gate.phase === 'closed' ? (
          <>
            <span className="inline-flex items-center gap-2 text-ink">
              <CalendarX className="h-5 w-5 text-bad" />
              <span className={cn('font-semibold', chromeText.base)}>Interview closed</span>
            </span>
            <p className={cn('text-ink3', chromeText.sm)}>
              This interview link is no longer active. Ask the interviewer for a new invite.
            </p>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 text-ink">
              <UserCheck className="h-5 w-5 text-accent" />
              <span className={cn('font-semibold', chromeText.base)}>Join “{gate.title}”</span>
            </span>
            <p className={cn('text-ink3', chromeText.sm)}>Enter your name so the interviewer knows who you are.</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) gate.submit(name.trim());
              }}
              placeholder="Your name"
              className={cn('border border-edge bg-panel2 px-2.5 py-2 text-ink outline-none placeholder:text-ink3 focus:border-accent', RADIUS_CTRL, chromeText.sm)}
            />
            <button
              type="button"
              onClick={() => gate.submit(name.trim() || 'Guest')}
              className={cn('inline-flex items-center justify-center gap-1.5 bg-accent px-3 py-2 font-medium text-white transition-opacity hover:opacity-90', RADIUS_CTRL, chromeText.sm)}
            >
              <UserCheck className="h-4 w-4" />
              Join interview
            </button>
          </>
        )}
      </div>
    </div>
  );
}
