import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Clock,
  Download,
  KeyRound,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type { Resume, ResumeMapping, ResumeVariant } from './data/resumesApi';
import { customizeResume, deleteResumeVariant, listResumeVariants } from './data/resumesApi';
import { formatResumeAiError, isOpenAIKeyError } from './formatResumeAiError';
import { FOCUS_PRESETS, reorderMappingForFocus } from './customize/reorder';
import { ResumeTemplate } from './ResumeTemplate';
import { useWorkspace } from '@/store/workspace';

interface CustomizerStudioProps {
  resume: Resume;
  canSave?: boolean;
  onMappingChange?: (mapping: ResumeMapping) => void;
}

export function CustomizerStudio({
  resume,
  canSave = true,
  onMappingChange,
}: CustomizerStudioProps) {
  const { openSettings } = useWorkspace();
  const previewRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState('java');
  const [targetRole, setTargetRole] = useState('Senior Java Engineer');
  const [mode, setMode] = useState<'rules' | 'ai'>('rules');
  const [preview, setPreview] = useState<ResumeMapping>(resume.mapping);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');
  const [variants, setVariants] = useState<ResumeVariant[]>([]);

  const refreshVariants = useCallback(async () => {
    if (!canSave) return;
    const list = await listResumeVariants(resume.id);
    setVariants(list);
  }, [resume.id, canSave]);

  useEffect(() => {
    setPreview(resume.mapping);
    refreshVariants();
  }, [resume.mapping, resume.id, refreshVariants]);

  const applyRules = useCallback(() => {
    const next = reorderMappingForFocus(resume.mapping, focus);
    setPreview(next);
    onMappingChange?.(next);
    setError('');
  }, [resume.mapping, focus, onMappingChange]);

  const applyCustomize = useCallback(async () => {
    setBusy(true);
    setError('');
    if (mode === 'rules') {
      applyRules();
      setBusy(false);
      return;
    }
    const res = await customizeResume(resume.id, { focus, targetRole, mode: 'ai' });
    setBusy(false);
    if (!res.ok) {
      setError(formatResumeAiError(res.error));
      return;
    }
    setPreview(res.result.mapping);
    onMappingChange?.(res.result.mapping);
  }, [resume.id, focus, targetRole, mode, applyRules, onMappingChange]);

  const saveVariant = useCallback(async () => {
    if (!focus.trim()) {
      setError('Enter a focus keyword before saving');
      return;
    }
    setSaving(true);
    setError('');
    const trimmedLabel = label.trim();
    const res = await customizeResume(resume.id, {
      focus,
      targetRole,
      mode,
      save: true,
      ...(trimmedLabel ? { label: trimmedLabel } : {}),
    });
    setSaving(false);
    if (!res.ok) {
      setError(formatResumeAiError(res.error));
      return;
    }
    setPreview(res.result.mapping);
    onMappingChange?.(res.result.mapping);
    setLabel('');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    refreshVariants();
  }, [resume.id, focus, targetRole, mode, label, onMappingChange, refreshVariants]);

  const selectPreset = (preset: (typeof FOCUS_PRESETS)[number]) => {
    setFocus(preset.focus);
    setTargetRole(preset.role);
    const next = reorderMappingForFocus(resume.mapping, preset.focus);
    setPreview(next);
    onMappingChange?.(next);
  };

  const loadVariant = (v: ResumeVariant) => {
    setFocus(v.focus);
    setTargetRole(v.targetRole);
    setMode(v.mode);
    setPreview(v.mapping);
    onMappingChange?.(v.mapping);
  };

  const removeVariant = async (variantId: string) => {
    const ok = await deleteResumeVariant(resume.id, variantId);
    if (!ok) {
      setError('Failed to delete variant');
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  };

  const exportPdf = useCallback(async () => {
    if (!previewRef.current) return;
    setError('');
    // html2canvas always reads `document.body`'s computed background-color to
    // composite transparent regions — even in foreignObject mode. This app's
    // themes set `--bg`/`--text` (and therefore body's background/color) as
    // oklch(), which html2canvas's parser can't read and throws on. Pin body
    // to a plain color for the duration of the export, then restore it.
    const bodyStyle = document.body.style;
    const prevBg = bodyStyle.backgroundColor;
    const prevColor = bodyStyle.color;
    bodyStyle.backgroundColor = '#ffffff';
    bodyStyle.color = '#111827';
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const safeName = `${resume.title}-${focus}`.replace(/[^a-z0-9\-_]+/gi, '_');
      await html2pdf()
        .set({
          margin: 0.4,
          filename: `${safeName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          // Native SVG foreignObject rendering also delegates color parsing
          // for the rest of the tree to the browser instead of html2canvas's
          // own CSS parser.
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            foreignObjectRendering: true,
          },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        } as Record<string, unknown>)
        .from(previewRef.current)
        .save();
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setError(detail ? `PDF export failed: ${detail}` : 'PDF export failed');
    } finally {
      bodyStyle.backgroundColor = prevBg;
      bodyStyle.color = prevColor;
    }
  }, [resume.title, focus]);

  return (
    <div className="resume-customizer-shell flex flex-1 min-h-0 flex-col lg:flex-row gap-4 p-4 overflow-hidden">
      {/* Controls */}
      <div className="resume-customizer-controls lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
        <div className="resume-customizer-card">
          <h3 className="resume-customizer-card__title text-sm font-semibold text-ink mb-2">
            Focus presets
          </h3>
          <div className="resume-customizer-presets flex flex-wrap gap-2">
            {FOCUS_PRESETS.map((p) => (
              <button
                key={p.focus}
                type="button"
                onClick={() => selectPreset(p)}
                className={cn(
                  'resume-customizer-preset rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                  focus === p.focus
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-edge bg-panel2 text-ink2 hover:border-accent/40',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="resume-customizer-card space-y-2">
          <label className={cn('block text-xs font-medium text-ink2', chromeText.base)}>
            Focus keyword
          </label>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="resume-customizer-input w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
            placeholder="e.g. java, python"
          />
        </div>

        <div className="resume-customizer-card space-y-2">
          <label className={cn('block text-xs font-medium text-ink2', chromeText.base)}>
            Target role
          </label>
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="resume-customizer-input w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
            placeholder="e.g. Senior Java Engineer"
          />
        </div>

        {canSave && (
          <div className="resume-customizer-card space-y-2">
            <label className={cn('block text-xs font-medium text-ink2', chromeText.base)}>
              Variant label <span className="text-ink3">(optional)</span>
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="resume-customizer-input w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
              placeholder={targetRole ? `${focus} — ${targetRole}` : focus || 'e.g. Java resume v2'}
            />
          </div>
        )}

        <div className="resume-customizer-card">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('rules')}
              className={cn(
                'resume-customizer-mode flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition',
                mode === 'rules'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-edge bg-panel2 text-ink2',
              )}
            >
              <Wand2 className="inline h-3.5 w-3.5 mr-1" />
              Rules
            </button>
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={cn(
                'resume-customizer-mode flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition',
                mode === 'ai'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-edge bg-panel2 text-ink2',
              )}
            >
              <Sparkles className="inline h-3.5 w-3.5 mr-1" />
              AI rewrite
            </button>
          </div>
          <p className={cn('mt-1.5 text-ink3', chromeText.sm)}>
            {mode === 'rules'
              ? 'Instantly reorders skills and bullets by tag match — no AI, fully deterministic.'
              : 'Rewrites the summary and bullets with AI to match the focus (takes a few seconds).'}
          </p>
        </div>

        <button
          type="button"
          onClick={applyCustomize}
          disabled={busy}
          className="resume-customizer-primary inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? 'Working…' : mode === 'ai' ? 'Generate with AI' : 'Apply reorder'}
        </button>

        <div className="resume-customizer-actions flex gap-2">
          {canSave && (
            <button
              type="button"
              onClick={saveVariant}
              disabled={saving}
              className={cn(
                'resume-customizer-secondary flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:opacity-50',
                savedFlash
                  ? 'border-good/40 bg-goodbg text-good'
                  : 'border-edge bg-panel2 text-ink hover:border-accent/40',
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedFlash ? (
                <Check className="h-4 w-4" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
              {saving ? 'Saving…' : savedFlash ? 'Saved' : 'Save'}
            </button>
          )}
          <button
            type="button"
            onClick={exportPdf}
            className="resume-customizer-secondary flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm font-medium text-ink transition hover:border-accent/40"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>

        {error && (
          <div className="resume-customizer-error space-y-1">
            <p className="text-xs text-bad">{error}</p>
            {isOpenAIKeyError(error) && (
              <button
                type="button"
                onClick={() => openSettings('profile')}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <KeyRound className="h-3 w-3" />
                Open Settings → Profile
              </button>
            )}
          </div>
        )}

        {canSave && variants.length > 0 && (
          <div className="resume-customizer-card">
            <h3 className="resume-customizer-card__title text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-ink3" />
              Saved variants
            </h3>
            <div className="flex flex-col gap-1.5">
              {variants.map((v) => (
                <div
                  key={v.id}
                  className="resume-customizer-variant flex items-center gap-1 rounded-lg border border-edge bg-panel2 pr-1"
                >
                  <button
                    type="button"
                    onClick={() => loadVariant(v)}
                    className="flex flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-panel"
                  >
                    <span className="truncate text-ink2">{v.label}</span>
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 font-semibold uppercase',
                        chromeText.xs,
                        v.mode === 'ai' ? 'bg-accent/15 text-accent' : 'bg-panel text-ink3',
                      )}
                    >
                      {v.mode}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVariant(v.id)}
                    className="rounded-lg p-1.5 text-ink3 transition hover:text-bad hover:bg-bad/10"
                    aria-label={`Delete ${v.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="resume-customizer-preview flex-1 min-h-0 overflow-y-auto rounded-xl border border-edge bg-panel2/50 p-4">
        <ResumeTemplate ref={previewRef} mapping={preview} focus={focus} />
      </div>
    </div>
  );
}
