import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  KeyRound,
  Loader2,
  LogIn,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/shell/auth/AuthProvider';
import { AuthPopover } from '@/shell/auth/AuthPopover';
import { chromeText } from '@/shell/chromeUi';
import { getProfileIntegrations } from '@/platform/api/profileIntegrationsApi';
import { useWorkspace } from '@/store/workspace';
import { CustomizerStudio } from './CustomizerStudio';
import { DirectoryHeader, DirectoryPage } from './DirectoryPage';
import { ResumeEditor } from './ResumeEditor';
import {
  deleteResume,
  getResume,
  listResumes,
  uploadResume,
  type Resume,
  type ResumeSummary,
} from './data/resumesApi';
import { formatResumeAiError, isOpenAIKeyError } from './formatResumeAiError';

type View = 'hub' | 'editor' | 'customizer' | 'directory';

function SignInGate() {
  const signInRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <FileText className="h-12 w-12 text-ink3" strokeWidth={1.3} />
        <h2 className="text-xl font-semibold text-ink">Resume Template Creator</h2>
        <p className={cn('max-w-sm text-ink3', chromeText.base)}>
          Sign in to upload your resume, get an AI-parsed mapping, and generate customized versions
          for Java, Python, and more.
        </p>
      </div>
      <button
        ref={signInRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
      >
        <LogIn className="h-4 w-4" />
        Sign in to get started
      </button>
      <AuthPopover open={open} onOpenChange={setOpen} anchorRef={signInRef} />
    </div>
  );
}

function UploadZone({
  onUploaded,
  onOpenSettings,
}: {
  onUploaded: (resume: Resume) => void;
  onOpenSettings: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError('');
    const res = await uploadResume(file);
    setBusy(false);
    if (!res.ok) {
      setError(formatResumeAiError(res.error));
      return;
    }
    onUploaded(res.resume);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={cn(
        'rounded-xl border-2 border-dashed p-8 text-center transition',
        dragOver ? 'border-accent bg-accent/5' : 'border-edge bg-panel/50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {busy ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className={cn('text-ink2', chromeText.base)}>Parsing your resume with AI…</p>
          <p className={cn('text-ink3', chromeText.sm)}>This can take up to 30 seconds.</p>
        </div>
      ) : (
        <>
          <Upload className="mx-auto h-8 w-8 text-ink3 mb-3" />
          <p className={cn('text-ink2 mb-1', chromeText.base)}>
            Drop your resume here or{' '}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-accent font-medium hover:underline"
            >
              browse files
            </button>
          </p>
          <p className={cn('text-ink3', chromeText.sm)}>PDF, DOCX, or TXT — max 5MB</p>
        </>
      )}
      {error && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-bad">{error}</p>
          {isOpenAIKeyError(error) && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Open Settings → Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ResumeCard({
  summary,
  onEdit,
  onCustomize,
  onDelete,
}: {
  summary: ResumeSummary;
  onEdit: () => void;
  onCustomize: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4 flex flex-col gap-3">
      <div>
        <p className="font-medium text-ink">{summary.title}</p>
        <p className={cn('text-ink3', chromeText.sm)}>{summary.originalFilename}</p>
        <p className={cn('text-ink3 mt-1', chromeText.sm)}>
          {summary.isPublic ? 'Public' : 'Private'} · Updated{' '}
          {new Date(summary.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-edge bg-panel2 px-3 py-1.5 text-xs font-medium text-ink2 hover:border-accent/40 transition"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={onCustomize}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
        >
          <Sparkles className="h-3 w-3" />
          Customize
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-edge bg-panel2 px-2 py-1.5 text-ink3 hover:text-bad hover:border-bad/40 transition"
          aria-label="Delete resume"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ResumesPage() {
  const { configured, isAnonymous, loading } = useAuth();
  const { goHome, openSettings } = useWorkspace();

  const [view, setView] = useState<View>('hub');
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [fetching, setFetching] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);

  const needsAuth = !configured || isAnonymous;

  const fetchIntegrations = useCallback(async () => {
    const data = await getProfileIntegrations();
    setOpenaiConfigured(data?.openai.configured ?? false);
  }, []);

  const fetchResumes = useCallback(async () => {
    setFetching(true);
    const list = await listResumes();
    setResumes(list);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!loading && !needsAuth) {
      fetchResumes();
      fetchIntegrations();
    }
  }, [loading, needsAuth, fetchResumes, fetchIntegrations]);

  const handleUploaded = (resume: Resume) => {
    setResumes((prev) => [
      {
        id: resume.id,
        title: resume.title,
        originalFilename: resume.originalFilename,
        isPublic: resume.isPublic,
        updatedAt: resume.updatedAt,
      },
      ...prev,
    ]);
    setActiveResume(resume);
    setView('editor');
  };

  const openResume = async (summary: ResumeSummary, target: 'editor' | 'customizer') => {
    const resume = await getResume(summary.id);
    if (!resume) return;
    setActiveResume(resume);
    setView(target);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await deleteResume(id);
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const headerTitle =
    view === 'directory'
      ? 'Resume Directory'
      : view === 'editor'
        ? 'Edit Mapping'
        : view === 'customizer'
          ? 'Customizer Studio'
          : 'Resume Template Creator';

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-edge px-4">
        <button
          type="button"
          onClick={() => {
            if (view !== 'hub') {
              setView('hub');
              setActiveResume(null);
            } else goHome();
          }}
          className="grid h-8 w-8 place-items-center rounded-xl border border-edge text-ink3 transition hover:bg-panel2 hover:text-ink"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <span className="font-semibold text-ink">{headerTitle}</span>
        </div>
        {view === 'hub' && !needsAuth && !loading && (
          <button
            type="button"
            onClick={() => setView('directory')}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-edge bg-panel2 px-3 py-1.5 text-xs font-medium text-ink2 hover:border-accent/40 transition"
          >
            <Users className="h-3.5 w-3.5" />
            Browse all resumes
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-ink3" />
        </div>
      ) : needsAuth ? (
        <SignInGate />
      ) : view === 'directory' ? (
        <>
          <DirectoryHeader />
          <DirectoryPage
            onSelect={(r) => {
              setActiveResume(r);
              setView('editor');
            }}
            onCustomize={(r) => {
              setActiveResume(r);
              setView('customizer');
            }}
          />
        </>
      ) : view === 'editor' && activeResume ? (
        <ResumeEditor
          resume={activeResume}
          onSaved={(r) => {
            setActiveResume(r);
            setResumes((prev) =>
              prev.map((s) =>
                s.id === r.id
                  ? {
                      ...s,
                      title: r.title,
                      isPublic: r.isPublic,
                      updatedAt: r.updatedAt,
                    }
                  : s,
              ),
            );
          }}
        />
      ) : view === 'customizer' && activeResume ? (
        <CustomizerStudio resume={activeResume} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl mx-auto w-full">
          {openaiConfigured === false && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
              <div className="flex items-start gap-2">
                <KeyRound className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                <p className={cn('text-ink2', chromeText.sm)}>
                  Add your OpenAI API key to parse resumes and use AI customization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openSettings('profile')}
                className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                Add API key
              </button>
            </div>
          )}

          <UploadZone onUploaded={handleUploaded} onOpenSettings={() => openSettings('profile')} />

          <section>
            <h2 className="text-sm font-semibold text-ink mb-3">My resumes</h2>
            {fetching ? (
              <Loader2 className="h-6 w-6 animate-spin text-ink3" />
            ) : resumes.length === 0 ? (
              <p className={cn('text-ink3', chromeText.base)}>
                No resumes yet. Upload one above to get started.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {resumes.map((r) => (
                  <ResumeCard
                    key={r.id}
                    summary={r}
                    onEdit={() => openResume(r, 'editor')}
                    onCustomize={() => openResume(r, 'customizer')}
                    onDelete={() => handleDelete(r.id, r.title)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
