import { useCallback, useState } from 'react';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type {
  Resume,
  ResumeExperience,
  ResumeMapping,
  ResumeProject,
  ResumeSkill,
} from './data/resumesApi';
import { updateResume } from './data/resumesApi';

const inputCls =
  'resume-editor-input w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15';

function tagsToStr(tags: string[]): string {
  return tags.join(', ');
}
function strToTags(s: string): string[] {
  return s
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function ResumeEditor({
  resume,
  onSaved,
}: {
  resume: Resume;
  onSaved: (r: Resume) => void;
}) {
  const [mapping, setMapping] = useState<ResumeMapping>(resume.mapping);
  const [title, setTitle] = useState(resume.title);
  const [isPublic, setIsPublic] = useState(resume.isPublic);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const save = useCallback(async () => {
    setBusy(true);
    const updated = await updateResume(resume.id, { title, mapping, isPublic });
    setBusy(false);
    if (updated) {
      onSaved(updated);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    }
  }, [resume.id, title, mapping, isPublic, onSaved]);

  // ── skills ──
  const updateSkill = (i: number, patch: Partial<ResumeSkill>) =>
    setMapping((m) => ({
      ...m,
      skills: m.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  const addSkill = () =>
    setMapping((m) => ({
      ...m,
      skills: [...m.skills, { name: '', category: '', tags: [], weight: 1 }],
    }));
  const removeSkill = (i: number) =>
    setMapping((m) => ({ ...m, skills: m.skills.filter((_, idx) => idx !== i) }));

  // ── experience ──
  const updateExp = (i: number, patch: Partial<ResumeExperience>) =>
    setMapping((m) => ({
      ...m,
      experience: m.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  const updateExpBullet = (ei: number, bi: number, text: string, tags: string[]) =>
    setMapping((m) => ({
      ...m,
      experience: m.experience.map((e, idx) =>
        idx === ei
          ? { ...e, bullets: e.bullets.map((b, j) => (j === bi ? { text, tags } : b)) }
          : e,
      ),
    }));
  const addExpBullet = (ei: number) =>
    setMapping((m) => ({
      ...m,
      experience: m.experience.map((e, idx) =>
        idx === ei ? { ...e, bullets: [...e.bullets, { text: '', tags: [] }] } : e,
      ),
    }));
  const removeExpBullet = (ei: number, bi: number) =>
    setMapping((m) => ({
      ...m,
      experience: m.experience.map((e, idx) =>
        idx === ei ? { ...e, bullets: e.bullets.filter((_, j) => j !== bi) } : e,
      ),
    }));

  // ── projects ──
  const updateProject = (i: number, patch: Partial<ResumeProject>) =>
    setMapping((m) => ({
      ...m,
      projects: m.projects.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));

  return (
    <div className="resume-editor-shell flex flex-col gap-4 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
      {/* Toolbar */}
      <div className="resume-editor-toolbar sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b border-edge bg-bg/95 px-4 py-2 backdrop-blur">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(
            'resume-editor-title-input flex-1 min-w-[200px]',
            inputCls,
            chromeText.base,
          )}
          placeholder="Resume title"
        />
        <label className="resume-editor-visibility flex items-center gap-2 text-sm text-ink2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded"
          />
          Public
        </label>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className={cn(
            'resume-editor-save inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50',
            savedFlash ? 'bg-good' : 'bg-accent',
          )}
        >
          {savedFlash ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {busy ? 'Saving…' : savedFlash ? 'Saved' : 'Save'}
        </button>
      </div>

      {/* Summary */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <h3 className="resume-editor-section__title text-sm font-semibold text-ink mb-2">
          Summary
        </h3>
        <textarea
          value={mapping.summary}
          onChange={(e) => setMapping({ ...mapping, summary: e.target.value })}
          rows={3}
          className={cn('resize-y', inputCls, chromeText.base)}
        />
      </section>

      {/* Contact */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <h3 className="resume-editor-section__title text-sm font-semibold text-ink mb-2">
          Contact
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['name', 'email', 'phone', 'location'] as const).map((field) => (
            <input
              key={field}
              value={mapping.contact?.[field] ?? ''}
              onChange={(e) =>
                setMapping({
                  ...mapping,
                  contact: { ...mapping.contact, [field]: e.target.value },
                })
              }
              placeholder={field}
              className={cn('capitalize', inputCls, chromeText.base)}
            />
          ))}
        </div>
        <input
          value={tagsToStr(mapping.contact?.links ?? [])}
          onChange={(e) =>
            setMapping({
              ...mapping,
              contact: {
                ...mapping.contact,
                links: e.target.value
                  .split(',')
                  .map((l) => l.trim())
                  .filter(Boolean),
              },
            })
          }
          placeholder="Links (comma separated)"
          className={cn('mt-2', inputCls, chromeText.base)}
        />
      </section>

      {/* Skills */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <div className="resume-editor-section__head flex items-center justify-between mb-2">
          <h3 className="resume-editor-section__title text-sm font-semibold text-ink">
            Skills ({mapping.skills.length})
          </h3>
          <button
            type="button"
            onClick={addSkill}
            className="resume-editor-add inline-flex items-center gap-1 rounded-lg border border-edge bg-panel2 px-2 py-1 text-xs text-ink2 hover:border-accent/40"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {mapping.skills.map((s, i) => (
            <div key={i} className="resume-editor-skill-row flex flex-wrap items-center gap-2">
              <input
                value={s.name}
                onChange={(e) => updateSkill(i, { name: e.target.value })}
                placeholder="Skill"
                className={cn('flex-1 min-w-[120px]', inputCls, chromeText.sm)}
              />
              <input
                value={tagsToStr(s.tags)}
                onChange={(e) => updateSkill(i, { tags: strToTags(e.target.value) })}
                placeholder="tags: java, backend"
                className={cn('flex-1 min-w-[140px]', inputCls, chromeText.sm)}
              />
              <button
                type="button"
                onClick={() => removeSkill(i)}
                className="resume-editor-remove rounded-lg border border-edge bg-panel2 px-2 py-2 text-ink3 hover:text-bad hover:border-bad/40"
                aria-label="Remove skill"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <h3 className="resume-editor-section__title text-sm font-semibold text-ink mb-2">
          Experience ({mapping.experience.length})
        </h3>
        {mapping.experience.map((exp, ei) => (
          <div
            key={ei}
            className="resume-editor-experience mb-4 border-b border-edge/50 pb-4 last:border-0 last:pb-0"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={exp.role}
                onChange={(e) => updateExp(ei, { role: e.target.value })}
                placeholder="Role"
                className={cn(inputCls, chromeText.sm)}
              />
              <input
                value={exp.company}
                onChange={(e) => updateExp(ei, { company: e.target.value })}
                placeholder="Company"
                className={cn(inputCls, chromeText.sm)}
              />
              <input
                value={exp.start}
                onChange={(e) => updateExp(ei, { start: e.target.value })}
                placeholder="Start"
                className={cn(inputCls, chromeText.sm)}
              />
              <input
                value={exp.end}
                onChange={(e) => updateExp(ei, { end: e.target.value })}
                placeholder="End"
                className={cn(inputCls, chromeText.sm)}
              />
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {exp.bullets.map((b, bi) => (
                <div key={bi} className="resume-editor-bullet-row flex items-start gap-2">
                  <textarea
                    value={b.text}
                    onChange={(e) => updateExpBullet(ei, bi, e.target.value, b.tags)}
                    rows={2}
                    placeholder="Bullet"
                    className={cn('flex-1 resize-y', inputCls, chromeText.sm)}
                  />
                  <div className="flex flex-col gap-1 w-32 shrink-0">
                    <input
                      value={tagsToStr(b.tags)}
                      onChange={(e) => updateExpBullet(ei, bi, b.text, strToTags(e.target.value))}
                      placeholder="tags"
                      className={cn(inputCls, chromeText.sm)}
                    />
                    <button
                      type="button"
                      onClick={() => removeExpBullet(ei, bi)}
                      className="resume-editor-remove rounded-lg border border-edge bg-panel2 px-2 py-1 text-xs text-ink3 hover:text-bad hover:border-bad/40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addExpBullet(ei)}
                className="resume-editor-add inline-flex items-center gap-1 self-start rounded-lg border border-edge bg-panel2 px-2 py-1 text-xs text-ink2 hover:border-accent/40"
              >
                <Plus className="h-3 w-3" /> Add bullet
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Projects */}
      {mapping.projects.length > 0 && (
        <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
          <h3 className="resume-editor-section__title text-sm font-semibold text-ink mb-2">
            Projects ({mapping.projects.length})
          </h3>
          {mapping.projects.map((p, i) => (
            <div key={i} className="resume-editor-project mb-2">
              <input
                value={p.name}
                onChange={(e) => updateProject(i, { name: e.target.value })}
                placeholder="Project name"
                className={cn(inputCls, chromeText.sm)}
              />
              <input
                value={tagsToStr(p.tags)}
                onChange={(e) => updateProject(i, { tags: strToTags(e.target.value) })}
                placeholder="tags"
                className={cn('mt-1', inputCls, chromeText.sm)}
              />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
