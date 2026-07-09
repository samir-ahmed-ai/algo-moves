import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { Avatar } from '@/design/components';
import type { Resume, ResumeDirectoryEntry } from './data/resumesApi';
import { getResume, listResumeDirectory } from './data/resumesApi';

interface DirectoryPageProps {
  onSelect: (resume: Resume) => void;
  onCustomize: (resume: Resume) => void;
}

export function DirectoryPage({ onSelect, onCustomize }: DirectoryPageProps) {
  const [entries, setEntries] = useState<ResumeDirectoryEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const fetchDirectory = useCallback(async () => {
    setFetching(true);
    const list = await listResumeDirectory();
    setEntries(list);
    setFetching(false);
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.ownerDisplayName.toLowerCase().includes(q) ||
        e.originalFilename.toLowerCase().includes(q),
    );
  }, [entries, query]);

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
      <div className="resume-directory-loading flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink3" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="resume-directory-empty flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
        <div className="resume-directory-empty__icon">
          <Users className="h-8 w-8" />
        </div>
        <h3>No public resumes yet</h3>
        <p className={cn('text-ink3', chromeText.base)}>
          Upload yours to seed the directory and make role-targeted versions easier to build.
        </p>
      </div>
    );
  }

  return (
    <div className="resume-directory-shell flex flex-1 flex-col min-h-0">
      <div className="resume-directory-search shrink-0 px-4 pt-3 pb-2">
        <div className="resume-directory-search__box relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, title, or file…"
            className={cn(
              'w-full rounded-xl border border-edge bg-panel2 py-2 pl-9 pr-3 text-ink outline-none',
              'placeholder:text-ink3 focus:border-accent/60 focus:ring-2 focus:ring-accent/15',
              chromeText.base,
            )}
          />
        </div>
      </div>

      <div className="resume-directory-grid-wrap flex-1 overflow-y-auto p-4 pt-1">
        {filtered.length === 0 ? (
          <div className="resume-directory-empty resume-directory-empty--compact">
            <div className="resume-directory-empty__icon">
              <Search className="h-7 w-7" />
            </div>
            <h3>No matches</h3>
            <p className={chromeText.base}>No resumes match &ldquo;{query}&rdquo;.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="resume-directory-card rounded-xl border border-edge bg-panel p-4 flex flex-col gap-3 transition hover:border-accent/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    seed={e.ownerAvatarSeed}
                    name={e.ownerDisplayName}
                    size={40}
                    className="resume-directory-card__avatar shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{e.title}</p>
                    <p className={cn('text-ink3 truncate', chromeText.sm)}>{e.ownerDisplayName}</p>
                  </div>
                </div>
                <p className={cn('resume-directory-card__file text-ink3 truncate', chromeText.sm)}>
                  {e.originalFilename}
                </p>
                <div className="resume-directory-card__actions flex gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => openResume(e.id, false)}
                    disabled={loadingId === e.id}
                    className="resume-directory-card__secondary flex-1 rounded-lg border border-edge bg-panel2 px-3 py-1.5 text-xs font-medium text-ink2 hover:border-accent/40 transition disabled:opacity-50"
                  >
                    {loadingId === e.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                    ) : (
                      'View'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openResume(e.id, true)}
                    disabled={loadingId === e.id}
                    className="resume-directory-card__primary flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition disabled:opacity-50"
                  >
                    Customize
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DirectoryHeader() {
  return (
    <div className="resume-directory-header flex items-center gap-2 px-4 py-2 border-b border-edge">
      <div className="resume-directory-header__icon">
        <FileText className="h-4 w-4" />
      </div>
      <div>
        <span className={cn('text-sm font-medium text-ink2', chromeText.base)}>
          Browse all resumes
        </span>
        <p className={cn('text-ink3', chromeText.xs)}>Discover public templates to adapt.</p>
      </div>
    </div>
  );
}
