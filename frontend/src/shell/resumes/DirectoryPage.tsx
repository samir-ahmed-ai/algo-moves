import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type { Resume, ResumeDirectoryEntry } from './data/resumesApi';
import { getResume, listResumeDirectory } from './data/resumesApi';

interface DirectoryPageProps {
  onSelect: (resume: Resume) => void;
  onCustomize: (resume: Resume) => void;
}

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 45% 45%)`;
}

export function DirectoryPage({ onSelect, onCustomize }: DirectoryPageProps) {
  const [entries, setEntries] = useState<ResumeDirectoryEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchDirectory = useCallback(async () => {
    setFetching(true);
    const list = await listResumeDirectory();
    setEntries(list);
    setFetching(false);
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const openResume = async (id: string, customize: boolean) => {
    setLoadingId(id);
    const resume = await getResume(id);
    setLoadingId(null);
    if (!resume) return;
    if (customize) onCustomize(resume);
    else onSelect(resume);
  };

  if (fetching) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink3" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
        <Users className="h-10 w-10 text-ink3" />
        <p className={cn('text-ink3', chromeText.base)}>
          No public resumes yet. Upload yours to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <div
            key={e.id}
            className="rounded-xl border border-edge bg-panel p-4 flex flex-col gap-3 transition hover:border-accent/30"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: avatarColor(e.ownerAvatarSeed) }}
              >
                {e.ownerDisplayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{e.title}</p>
                <p className={cn('text-ink3 truncate', chromeText.sm)}>{e.ownerDisplayName}</p>
              </div>
            </div>
            <p className={cn('text-ink3 truncate', chromeText.sm)}>{e.originalFilename}</p>
            <div className="flex gap-2 mt-auto">
              <button
                type="button"
                onClick={() => openResume(e.id, false)}
                disabled={loadingId === e.id}
                className="flex-1 rounded-lg border border-edge bg-panel2 px-3 py-1.5 text-xs font-medium text-ink2 hover:border-accent/40 transition disabled:opacity-50"
              >
                {loadingId === e.id ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'View'}
              </button>
              <button
                type="button"
                onClick={() => openResume(e.id, true)}
                disabled={loadingId === e.id}
                className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
              >
                Customize
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DirectoryHeader() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-edge">
      <FileText className="h-4 w-4 text-ink3" />
      <span className={cn('text-sm font-medium text-ink2', chromeText.base)}>
        Browse all resumes
      </span>
    </div>
  );
}
