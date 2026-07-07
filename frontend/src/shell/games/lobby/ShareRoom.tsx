import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import { getArcadeStrings, type GameLocale } from '../locale';
import { buildGamesUrl } from '@/lib/navigation';
import { TouchButton } from '../ui/gamesUi';
import { COPY_FEEDBACK_MS } from '@/shell/copyFeedback';

/** The pairing card: big room code, a QR to scan, and a copy-link button. */
export function ShareRoom({
  room,
  hint,
  locale,
}: {
  room: string;
  hint: string | undefined;
  locale: GameLocale;
}) {
  const t = useMemo(() => getArcadeStrings(locale), [locale]);
  const url = buildGamesUrl(room);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      /* clipboard may be blocked; the code + QR still work */
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/74 p-5 shadow-[0_18px_58px_rgba(15,23,42,0.1)] backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
          {t.shareRoom.roomCode}
        </p>
        <p
          dir="ltr"
          className="mt-1 font-mono text-4xl font-black tracking-[0.3em] text-slate-950 dark:text-white"
        >
          {room}
        </p>
      </div>
      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
        <QRCodeSVG
          value={url}
          size={148}
          level="M"
          title={t.shareRoom.qrTitle(room)}
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
      </div>
      {hint ? (
        <p className="max-w-xs text-center text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
      <TouchButton
        variant="ghost"
        size="md"
        icon={
          copied ? (
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-200" />
          ) : (
            <Copy className="h-4 w-4" />
          )
        }
        onClick={copy}
      >
        {copied ? t.shareRoom.linkCopied : t.shareRoom.copyLink}
      </TouchButton>
      <p
        dir="ltr"
        className="flex items-center gap-1.5 break-all rounded-2xl bg-slate-950/5 px-3 py-2 text-center text-[length:var(--fs-tight)] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400"
      >
        <LinkIcon className="h-3 w-3 shrink-0" />
        {url}
      </p>
    </div>
  );
}
