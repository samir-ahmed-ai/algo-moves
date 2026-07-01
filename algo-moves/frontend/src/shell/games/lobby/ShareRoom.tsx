import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import { buildGamesUrl } from '../engine/gamesHash';
import { TouchButton } from '../ui/gamesUi';

/** The pairing card: big room code, a QR to scan, and a copy-link button. */
export function ShareRoom({ room, hint }: { room: string; hint?: string }) {
  const url = buildGamesUrl(room);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked; the code + QR still work */
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius)] border border-edge bg-panel/70 p-5">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink3">Room code</p>
        <p className="mt-1 font-mono text-4xl font-bold tracking-[0.3em] text-accent">{room}</p>
      </div>
      <div className="rounded-lg bg-white p-3">
        <QRCodeSVG value={url} size={148} level="M" title={`Join room ${room}`} />
      </div>
      {hint ? <p className="max-w-xs text-center text-xs leading-relaxed text-ink3">{hint}</p> : null}
      <TouchButton variant="ghost" size="md" icon={copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />} onClick={copy}>
        {copied ? 'Link copied' : 'Copy invite link'}
      </TouchButton>
      <p className="flex items-center gap-1.5 break-all text-center text-[11px] text-ink3">
        <LinkIcon className="h-3 w-3 shrink-0" />
        {url}
      </p>
    </div>
  );
}
