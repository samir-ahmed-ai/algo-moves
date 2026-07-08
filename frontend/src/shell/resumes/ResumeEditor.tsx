import { useCallback, useState } from 'react';
import { AlertTriangle, Check, Eye, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type {
  Resume,
  ResumeEducation,
  ResumeExperience,
  ResumeMapping,
  ResumeProject,
  ResumeSkill,
} from './data/resumesApi';
import { updateResume } from './data/resumesApi';

const inputCls =
  'resume-editor-input w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60';

const emptyEducation: ResumeEducation = { school: '', degree: '', start: '', end: '', details: '' };

function tagsToStr(tags: string[]): string {
  return tags.join(', ');
}
function strToTags(s: string): string[] {
  return s
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function SectionHead({
  title,
  count,
  onAdd,
  addLabel = 'Add',
  readOnly,
}: {
  title: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="resume-editor-section__head flex items-center justify-between mb-2">
      <h3 className="resume-editor-section__title text-sm font-semibold text-ink">
        {title}
        {count !== undefined ? ` (${count})` : ''}
      </h3>
      {onAdd && !readOnly ? (
        <button
          type="button"
          onClick={onAdd}
          className="resume-editor-add inline-flex items-center gap-1 rounded-lg border border-edge bg-panel2 px-2 py-1 text-xs text-ink2 hover:border-accent/40"
        >
          <Plus className="h-3 w-3" /> {addLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ResumeEditor({
  resume,
  readOnly = false,
  onSaved,
  onCustomize,
}: {
  resume: Resume;
  readOnly?: boolean;
  onSaved: (r: Resume) => void;
  onCustomize?: () => void;
}) {
  const [mapping, setMapping] = useState<ResumeMapping>(resume.mapping);
  const [title, setTitle] = useState(resume.title);
  const [isPublic, setIsPublic] = useState(resume.isPublic);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState('');

  const save = useCallback(async () => {
    setBusy(true);
    setSaveError('');
    const updated = await updateResume(resume.id, { title, mapping, isPublic });
    setBusy(false);
    if (updated) {
      onSaved(updated);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } else {
      setSaveError('Could not save — please try again.');
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
  const addExperience = () =>
    setMapping((m) => ({
      ...m,
      experience: [...m.experience, { company: '', role: '', start: '', end: '', bullets: [] }],
    }));
  const removeExperience = (ei: number) =>
    setMapping((m) => ({ ...m, experience: m.experience.filter((_, idx) => idx !== ei) }));
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
  const addProject = () =>
    setMapping((m) => ({ ...m, projects: [...m.projects, { name: '', tags: [], bullets: [] }] }));
  const removeProject = (pi: number) =>
    setMapping((m) => ({ ...m, projects: m.projects.filter((_, idx) => idx !== pi) }));
  const updateProjectBullet = (pi: number, bi: number, text: string, tags: string[]) =>
    setMapping((m) => ({
      ...m,
      projects: m.projects.map((p, idx) =>
        idx === pi
          ? { ...p, bullets: p.bullets.map((b, j) => (j === bi ? { text, tags } : b)) }
          : p,
      ),
    }));
  const addProjectBullet = (pi: number) =>
    setMapping((m) => ({
      ...m,
      projects: m.projects.map((p, idx) =>
        idx === pi ? { ...p, bullets: [...p.bullets, { text: '', tags: [] }] } : p,
      ),
    }));
  const removeProjectBullet = (pi: number, bi: number) =>
    setMapping((m) => ({
      ...m,
      projects: m.projects.map((p, idx) =>
        idx === pi ? { ...p, bullets: p.bullets.filter((_, j) => j !== bi) } : p,
      ),
    }));

  // ── education ──
  const updateEducation = (i: number, patch: Partial<ResumeEducation>) =>
    setMapping((m) => ({
      ...m,
      education: m.education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  const addEducation = () =>
    setMapping((m) => ({ ...m, education: [...m.education, { ...emptyEducation }] }));
  const removeEducation = (i: number) =>
    setMapping((m) => ({ ...m, education: m.education.filter((_, idx) => idx !== i) }));

  // ── certifications ──
  const updateCertification = (i: number, value: string) =>
    setMapping((m) => ({
      ...m,
      certifications: m.certifications.map((c, idx) => (idx === i ? value : c)),
    }));
  const addCertification = () =>
    setMapping((m) => ({ ...m, certifications: [...m.certifications, ''] }));
  const removeCertification = (i: number) =>
    setMapping((m) => ({
      ...m,
      certifications: m.certifications.filter((_, idx) => idx !== i),
    }));

  return (
    <div className="resume-editor-shell flex flex-col gap-4 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
      {readOnly && (
        <div className="resume-editor-readonly-banner flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <Eye className="h-4 w-4 shrink-0 text-accent" />
          <p className={cn('flex-1 text-ink2', chromeText.sm)}>
            You’re viewing a public resume — changes can’t be saved here.
          </p>
          {onCustomize && (
            <button
              type="button"
              onClick={onCustomize}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Make it yours
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="resume-editor-toolbar sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b border-edge bg-bg/95 px-4 py-2 backdrop-blur">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={readOnly}
          maxLength={200}
          className={cn(
            'resume-editor-title-input flex-1 min-w-[200px]',
            inputCls,
            chromeText.base,
          )}
          placeholder="Resume title"
        />
        {readOnly ? (
          <span
            className={cn(
              'resume-editor-visibility inline-flex items-center gap-2 text-ink3',
              chromeText.sm,
            )}
          >
            {isPublic ? 'Public' : 'Private'}
          </span>
        ) : (
          <label className="resume-editor-visibility flex items-center gap-2 text-sm text-ink2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            Public
          </label>
        )}
        {!readOnly && (
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
        )}
      </div>

      {saveError && (
        <div className="resume-editor-save-error flex items-center gap-2 rounded-xl border border-bad/30 bg-badbg px-3 py-2 text-bad">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className={chromeText.sm}>{saveError}</p>
        </div>
      )}

      {/* Summary */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <h3 className="resume-editor-section__title text-sm font-semibold text-ink mb-2">
          Summary
        </h3>
        <textarea
          value={mapping.summary}
          onChange={(e) => setMapping({ ...mapping, summary: e.target.value })}
          disabled={readOnly}
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
              disabled={readOnly}
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
          disabled={readOnly}
          placeholder="Links (comma separated)"
          className={cn('mt-2', inputCls, chromeText.base)}
        />
      </section>

      {/* Skills */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <SectionHead
          title="Skills"
          count={mapping.skills.length}
          onAdd={addSkill}
          readOnly={readOnly}
        />
        <div className="flex flex-col gap-2">
          {mapping.skills.map((s, i) => (
            <div key={i} className="resume-editor-skill-row flex flex-wrap items-center gap-2">
              <input
                value={s.name}
                onChange={(e) => updateSkill(i, { name: e.target.value })}
                disabled={readOnly}
                placeholder="Skill"
                className={cn('flex-1 min-w-[120px]', inputCls, chromeText.sm)}
              />
              <input
                value={tagsToStr(s.tags)}
                onChange={(e) => updateSkill(i, { tags: strToTags(e.target.value) })}
                disabled={readOnly}
                placeholder="tags: java, backend"
                className={cn('flex-1 min-w-[140px]', inputCls, chromeText.sm)}
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeSkill(i)}
                  className="resume-editor-remove rounded-lg border border-edge bg-panel2 px-2 py-2 text-ink3 hover:text-bad hover:border-bad/40"
                  aria-label="Remove skill"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <SectionHead
          title="Experience"
          count={mapping.experience.length}
          onAdd={addExperience}
          addLabel="Add role"
          readOnly={readOnly}
        />
        {mapping.experience.map((exp, ei) => (
          <div key={ei} className="resume-editor-experience mb-3 last:mb-0">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input
                  value={exp.role}
                  onChange={(e) => updateExp(ei, { role: e.target.value })}
                  disabled={readOnly}
                  placeholder="Role"
                  className={cn(inputCls, chromeText.sm)}
                />
                <input
                  value={exp.company}
                  onChange={(e) => updateExp(ei, { company: e.target.value })}
                  disabled={readOnly}
                  placeholder="Company"
                  className={cn(inputCls, chromeText.sm)}
                />
                <input
                  value={exp.start}
                  onChange={(e) => updateExp(ei, { start: e.target.value })}
                  disabled={readOnly}
                  placeholder="Start"
                  className={cn(inputCls, chromeText.sm)}
                />
                <input
                  value={exp.end}
                  onChange={(e) => updateExp(ei, { end: e.target.value })}
                  disabled={readOnly}
                  placeholder="End"
                  className={cn(inputCls, chromeText.sm)}
                />
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeExperience(ei)}
                  className="resume-editor-remove shrink-0 rounded-lg border border-edge bg-panel2 px-2 py-2 text-ink3 hover:text-bad hover:border-bad/40"
                  aria-label="Remove role"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {exp.bullets.map((b, bi) => (
                <div key={bi} className="resume-editor-bullet-row flex items-start gap-2">
                  <textarea
                    value={b.text}
                    onChange={(e) => updateExpBullet(ei, bi, e.target.value, b.tags)}
                    disabled={readOnly}
                    rows={2}
                    placeholder="Bullet"
                    className={cn('flex-1 resize-y', inputCls, chromeText.sm)}
                  />
                  <div className="flex flex-col gap-1 w-32 shrink-0">
                    <input
                      value={tagsToStr(b.tags)}
                      onChange={(e) => updateExpBullet(ei, bi, b.text, strToTags(e.target.value))}
                      disabled={readOnly}
                      placeholder="tags"
                      className={cn(inputCls, chromeText.sm)}
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeExpBullet(ei, bi)}
                        className="resume-editor-remove rounded-lg border border-edge bg-panel2 px-2 py-1 text-xs text-ink3 hover:text-bad hover:border-bad/40"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => addExpBullet(ei)}
                  className="resume-editor-add inline-flex items-center gap-1 self-start rounded-lg border border-edge bg-panel2 px-2 py-1 text-xs text-ink2 hover:border-accent/40"
                >
                  <Plus className="h-3 w-3" /> Add bullet
                </button>
              )}
            </div>
          </div>
        ))}
        {mapping.experience.length === 0 && (
          <p className={cn('text-ink3', chromeText.sm)}>No experience entries yet.</p>
        )}
      </section>

      {/* Projects */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <SectionHead
          title="Projects"
          count={mapping.projects.length}
          onAdd={addProject}
          addLabel="Add project"
          readOnly={readOnly}
        />
        {mapping.projects.map((p, pi) => (
          <div key={pi} className="resume-editor-experience mb-3 last:mb-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 flex flex-col gap-2">
                <input
                  value={p.name}
                  onChange={(e) => updateProject(pi, { name: e.target.value })}
                  disabled={readOnly}
                  placeholder="Project name"
                  className={cn(inputCls, chromeText.sm)}
                />
                <input
                  value={tagsToStr(p.tags)}
                  onChange={(e) => updateProject(pi, { tags: strToTags(e.target.value) })}
                  disabled={readOnly}
                  placeholder="tags"
                  className={cn(inputCls, chromeText.sm)}
                />
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeProject(pi)}
                  className="resume-editor-remove shrink-0 rounded-lg border border-edge bg-panel2 px-2 py-2 text-ink3 hover:text-bad hover:border-bad/40"
                  aria-label="Remove project"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {p.bullets.map((b, bi) => (
                <div key={bi} className="resume-editor-bullet-row flex items-start gap-2">
                  <textarea
                    value={b.text}
                    onChange={(e) => updateProjectBullet(pi, bi, e.target.value, b.tags)}
                    disabled={readOnly}
                    rows={2}
                    placeholder="Bullet"
                    className={cn('flex-1 resize-y', inputCls, chromeText.sm)}
                  />
                  <div className="flex flex-col gap-1 w-32 shrink-0">
                    <input
                      value={tagsToStr(b.tags)}
                      onChange={(e) =>
                        updateProjectBullet(pi, bi, b.text, strToTags(e.target.value))
                      }
                      disabled={readOnly}
                      placeholder="tags"
                      className={cn(inputCls, chromeText.sm)}
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeProjectBullet(pi, bi)}
                        className="resume-editor-remove rounded-lg border border-edge bg-panel2 px-2 py-1 text-xs text-ink3 hover:text-bad hover:border-bad/40"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => addProjectBullet(pi)}
                  className="resume-editor-add inline-flex items-center gap-1 self-start rounded-lg border border-edge bg-panel2 px-2 py-1 text-xs text-ink2 hover:border-accent/40"
                >
                  <Plus className="h-3 w-3" /> Add bullet
                </button>
              )}
            </div>
          </div>
        ))}
        {mapping.projects.length === 0 && (
          <p className={cn('text-ink3', chromeText.sm)}>No projects yet.</p>
        )}
      </section>

      {/* Education */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <SectionHead
          title="Education"
          count={mapping.education.length}
          onAdd={addEducation}
          addLabel="Add school"
          readOnly={readOnly}
        />
        {mapping.education.map((edu, i) => (
          <div key={i} className="resume-editor-experience mb-3 last:mb-0">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input
                  value={edu.school}
                  onChange={(e) => updateEducation(i, { school: e.target.value })}
                  disabled={readOnly}
                  placeholder="School"
                  className={cn(inputCls, chromeText.sm)}
                />
                <input
                  value={edu.degree}
                  onChange={(e) => updateEducation(i, { degree: e.target.value })}
                  disabled={readOnly}
                  placeholder="Degree"
                  className={cn(inputCls, chromeText.sm)}
                />
                <input
                  value={edu.start}
                  onChange={(e) => updateEducation(i, { start: e.target.value })}
                  disabled={readOnly}
                  placeholder="Start"
                  className={cn(inputCls, chromeText.sm)}
                />
                <input
                  value={edu.end}
                  onChange={(e) => updateEducation(i, { end: e.target.value })}
                  disabled={readOnly}
                  placeholder="End"
                  className={cn(inputCls, chromeText.sm)}
                />
                <input
                  value={edu.details}
                  onChange={(e) => updateEducation(i, { details: e.target.value })}
                  disabled={readOnly}
                  placeholder="Details (e.g. GPA, honors)"
                  className={cn('sm:col-span-2', inputCls, chromeText.sm)}
                />
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeEducation(i)}
                  className="resume-editor-remove shrink-0 rounded-lg border border-edge bg-panel2 px-2 py-2 text-ink3 hover:text-bad hover:border-bad/40"
                  aria-label="Remove education entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {mapping.education.length === 0 && (
          <p className={cn('text-ink3', chromeText.sm)}>No education entries yet.</p>
        )}
      </section>

      {/* Certifications */}
      <section className="resume-editor-section rounded-xl border border-edge bg-panel p-4">
        <SectionHead
          title="Certifications"
          count={mapping.certifications.length}
          onAdd={addCertification}
          readOnly={readOnly}
        />
        <div className="flex flex-col gap-2">
          {mapping.certifications.map((c, i) => (
            <div key={i} className="resume-editor-skill-row flex items-center gap-2">
              <input
                value={c}
                onChange={(e) => updateCertification(i, e.target.value)}
                disabled={readOnly}
                placeholder="Certification"
                className={cn('flex-1', inputCls, chromeText.sm)}
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeCertification(i)}
                  className="resume-editor-remove rounded-lg border border-edge bg-panel2 px-2 py-2 text-ink3 hover:text-bad hover:border-bad/40"
                  aria-label="Remove certification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {mapping.certifications.length === 0 && (
          <p className={cn('text-ink3', chromeText.sm)}>No certifications yet.</p>
        )}
      </section>
    </div>
  );
}
