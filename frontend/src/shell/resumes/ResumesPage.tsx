import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FileText, KeyRound, Loader2, Pencil, Sparkles, Trash2, Upload, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/shell/auth/AuthProvider';
import { ProductAuthGate } from '@/shell/auth/ProductAuthGate';
import { PageHeader } from '@/shell/chrome/PageHeader';
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
type DeleteTarget = {
  id: string;
  title: string;
};

function SignInGate() {
  return (
    <ProductAuthGate
      variant="resumes"
      icon={<FileText className="h-6 w-6" strokeWidth={1.5} />}
      eyebrow="Resume operating system"
      title="Turn one resume into targeted versions."
      lede="Upload once, get an AI-parsed skill map, and generate role-specific resumes for Java, Python, frontend, backend, and more."
      features={[
        { icon: <Upload className="h-4 w-4" />, label: 'Upload PDF, DOCX, or text' },
        { icon: <Sparkles className="h-4 w-4" />, label: 'AI mapping for stronger bullets' },
        { icon: <Users className="h-4 w-4" />, label: 'Versions for each target role' },
      ]}
      preview={
        <>
          <div className="resume-preview-sheet">
            <div className="resume-preview-sheet__top">
              <span>Backend SWE</span>
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="resume-preview-sheet__line resume-preview-sheet__line--wide" />
            <div className="resume-preview-sheet__line" />
            <div className="resume-preview-sheet__bullets">
              <span />
              <span />
              <span />
            </div>
          </div>
        </>
      }
    />
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

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
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
        'resume-upload-zone rounded-3xl border-2 border-dashed p-8 text-center shadow-theme-sm transition',
        dragOver ? 'border-accent bg-accentbg shadow-theme-md' : 'border-edge bg-panel/60',
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
          <div className="resume-upload-zone__icon">
            <Upload className="h-7 w-7" />
          </div>
          <p className={cn('text-ink2 mb-1', chromeText.base)}>
            Drop your resume here or{' '}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="resume-upload-zone__browse text-accent font-semibold hover:underline"
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
    <div className="resume-card flex flex-col gap-3 rounded-2xl border border-edge bg-panel/90 p-4 shadow-theme-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-theme-md">
      <div className="resume-card__body">
        <p className="font-medium text-ink">{summary.title}</p>
        <p className={cn('text-ink3', chromeText.sm)}>{summary.originalFilename}</p>
        <p className={cn('text-ink3 mt-1', chromeText.sm)}>
          {summary.isPublic ? 'Public' : 'Private'} · Updated{' '}
          {new Date(summary.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="resume-card__actions flex gap-2 mt-auto">
        <button
          type="button"
          onClick={onEdit}
          className="resume-card__secondary inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-edge bg-panel2 px-3 py-1.5 text-xs font-medium text-ink2 transition hover:border-accent/40"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={onCustomize}
          className="resume-card__primary inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] shadow-theme-sm transition hover:opacity-90"
        >
          <Sparkles className="h-3 w-3" />
          Customize
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="resume-card__delete rounded-full border border-edge bg-panel2 px-2 py-1.5 text-ink3 transition hover:border-bad/40 hover:text-bad"
          aria-label="Delete resume"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ResumesPage() {
  const { configured, isAnonymous, loading, profile } = useAuth();
  const { goHome, openSettings } = useWorkspace();

  const [view, setView] = useState<View>('hub');
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [fetching, setFetching] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteResume(deleteTarget.id);
    setResumes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const headerTitle =
    view === 'directory'
      ? 'Resume Directory'
      : view === 'editor'
        ? activeResume && activeResume.ownerProfileId !== profile?.id
          ? 'View Resume'
          : 'Edit Mapping'
        : view === 'customizer'
          ? 'Customizer Studio'
          : 'Resume Template Creator';

  return (
    <div
      className="relative isolate flex h-full flex-col overflow-hidden bg-bg"
      data-surface="resumes"
      aria-label="Resume template creator"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,color-mix(in_srgb,var(--accent)_24%,transparent),transparent_28rem),radial-gradient(circle_at_88%_18%,rgba(248,214,121,0.12),transparent_24rem)]"
      />
      <PageHeader
        onBack={() => {
          if (view !== 'hub') {
            setView('hub');
            setActiveResume(null);
          } else goHome();
        }}
        icon={<FileText />}
        eyebrow="targeted resume studio"
        title={headerTitle}
        actions={
          view === 'hub' && !needsAuth && !loading ? (
            <button
              type="button"
              onClick={() => setView('directory')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-panel2 px-3 py-1.5 text-xs font-medium text-ink2 transition hover:border-accent/40"
            >
              <Users className="h-3.5 w-3.5" />
              Browse all resumes
            </button>
          ) : null
        }
      />

      <main className="flex flex-1 min-h-0 flex-col overflow-auto">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-3xl border border-edge bg-panel/80 shadow-theme-md">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
            <p className="text-sm font-medium text-ink2">Loading resume studio…</p>
          </div>
        ) : needsAuth ? (
          <SignInGate />
        ) : view === 'directory' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
          </div>
        ) : view === 'editor' && activeResume ? (
          <ResumeEditor
            resume={activeResume}
            readOnly={activeResume.ownerProfileId !== profile?.id}
            onCustomize={() => setView('customizer')}
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
          <div className="product-hub-shell mx-auto w-full max-w-3xl flex-1 space-y-6 p-4">
            {openaiConfigured === false && (
              <div className="product-hub-notice flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
                <div className="flex items-start gap-2">
                  <KeyRound className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                  <p className={cn('text-ink2', chromeText.sm)}>
                    Add your OpenAI API key to parse resumes and use AI customization.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openSettings('profile')}
                  className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition"
                >
                  Add API key
                </button>
              </div>
            )}

            <section className="product-hub-card">
              <div className="product-hub-card__head">
                <div>
                  <span className="product-hub-card__eyebrow">resume intake</span>
                  <h2>Upload source resume</h2>
                </div>
                <Upload className="h-4 w-4 text-accent" />
              </div>
              <UploadZone
                onUploaded={handleUploaded}
                onOpenSettings={() => openSettings('profile')}
              />
            </section>

            <section className="product-hub-card">
              <div className="product-hub-card__head mb-3">
                <div>
                  <span className="product-hub-card__eyebrow">library</span>
                  <h2>My resumes</h2>
                </div>
                <FileText className="h-4 w-4 text-accent" />
              </div>
              {fetching ? (
                <Loader2 className="h-6 w-6 animate-spin text-ink3" />
              ) : resumes.length === 0 ? (
                <div className="product-empty-state">
                  <div className="product-empty-state__icon">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h3>No resumes yet</h3>
                  <p className={chromeText.base}>
                    Upload a source resume above to unlock editing, AI parsing, and targeted
                    versions.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {resumes.map((r) => (
                    <ResumeCard
                      key={r.id}
                      summary={r}
                      onEdit={() => openResume(r, 'editor')}
                      onCustomize={() => openResume(r, 'customizer')}
                      onDelete={() => setDeleteTarget({ id: r.id, title: r.title })}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-md"
          onClick={() => setDeleteTarget(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-edge bg-panel/95 p-6 shadow-theme-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-resume-title"
          >
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-badbg text-bad">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 id="delete-resume-title" className="mb-1 font-semibold text-ink">
              Delete resume?
            </h3>
            <p className={cn('mb-5 text-ink3', chromeText.sm)}>
              This will permanently delete “{deleteTarget.title}” and its saved mapping.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-edge px-4 py-2 text-sm font-medium text-ink3 transition hover:bg-panel2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl bg-bad px-4 py-2 text-sm font-semibold text-badbg shadow-theme-sm transition hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
