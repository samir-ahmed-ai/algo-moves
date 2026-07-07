import { forwardRef } from 'react';
import type { ResumeMapping } from './data/resumesApi';

interface ResumeTemplateProps {
  mapping: ResumeMapping;
  focus?: string;
  className?: string;
}

function matchesFocus(tags: string[] | undefined, text: string, focus?: string): boolean {
  if (!focus) return false;
  const f = focus.toLowerCase().trim();
  if (!f) return false;
  if (text.toLowerCase().includes(f)) return true;
  return (tags ?? []).some((t) => t.toLowerCase().includes(f));
}

export const ResumeTemplate = forwardRef<HTMLDivElement, ResumeTemplateProps>(
  function ResumeTemplate({ mapping, focus, className = '' }, ref) {
    const { summary, skills, experience, projects, education, certifications } = mapping;
    const contact = mapping.contact ?? { name: '', email: '', phone: '', location: '', links: [] };

    const highlight = 'resume-template__highlight';

    return (
      <div
        ref={ref}
        className={`resume-template mx-auto bg-white text-gray-900 p-8 text-[11pt] leading-snug shadow-sm ${className}`}
        style={{ maxWidth: '8.5in' }}
      >
        <header className="resume-template__header border-b-2 border-gray-800 pb-3 mb-4 text-center">
          <h1 className="resume-template__name text-2xl font-bold tracking-wide uppercase">
            {contact.name || 'Your Name'}
          </h1>
          <p className="resume-template__contact mt-1 text-sm text-gray-600">
            {[contact.email, contact.phone, contact.location].filter(Boolean).join(' · ')}
          </p>
          {contact.links?.length > 0 && (
            <p className="resume-template__links mt-0.5 text-xs text-gray-500">
              {contact.links.join(' · ')}
            </p>
          )}
        </header>

        {summary && (
          <section className="resume-template__section mb-4">
            <h2 className="resume-template__section-title text-sm font-bold uppercase tracking-wider border-b border-gray-400 mb-1">
              Summary
            </h2>
            <p className="resume-template__summary text-sm">{summary}</p>
          </section>
        )}

        {skills?.length > 0 && (
          <section className="resume-template__section mb-4">
            <h2 className="resume-template__section-title text-sm font-bold uppercase tracking-wider border-b border-gray-400 mb-1">
              Skills
            </h2>
            <div className="resume-template__skills flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {skills.map((s, i) => (
                <span
                  key={i}
                  className={`resume-template__skill ${matchesFocus(s.tags, s.name, focus) ? highlight : ''}`}
                >
                  <strong>{s.name}</strong>
                  {s.category ? ` (${s.category})` : ''}
                </span>
              ))}
            </div>
          </section>
        )}

        {experience?.length > 0 && (
          <section className="resume-template__section mb-4">
            <h2 className="resume-template__section-title text-sm font-bold uppercase tracking-wider border-b border-gray-400 mb-2">
              Experience
            </h2>
            {experience.map((exp, i) => (
              <div key={i} className="resume-template__entry mb-3 break-inside-avoid">
                <div className="resume-template__entry-head flex justify-between items-baseline">
                  <span className="resume-template__role font-bold text-sm">{exp.role}</span>
                  <span className="resume-template__dates text-xs text-gray-600">
                    {exp.start} – {exp.end || 'Present'}
                  </span>
                </div>
                <div className="resume-template__company text-sm italic text-gray-700">
                  {exp.company}
                </div>
                {exp.bullets?.length > 0 && (
                  <ul className="resume-template__bullets mt-1 list-disc pl-5 text-sm space-y-0.5">
                    {exp.bullets.map((b, j) => (
                      <li key={j} className={matchesFocus(b.tags, b.text, focus) ? highlight : ''}>
                        {b.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {projects?.length > 0 && (
          <section className="resume-template__section mb-4">
            <h2 className="resume-template__section-title text-sm font-bold uppercase tracking-wider border-b border-gray-400 mb-2">
              Projects
            </h2>
            {projects.map((p, i) => (
              <div key={i} className="resume-template__entry mb-2 break-inside-avoid">
                <div className="resume-template__project-name font-bold text-sm">{p.name}</div>
                {p.bullets?.length > 0 && (
                  <ul className="resume-template__bullets mt-0.5 list-disc pl-5 text-sm space-y-0.5">
                    {p.bullets.map((b, j) => (
                      <li key={j} className={matchesFocus(b.tags, b.text, focus) ? highlight : ''}>
                        {b.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {education?.length > 0 && (
          <section className="resume-template__section mb-4">
            <h2 className="resume-template__section-title text-sm font-bold uppercase tracking-wider border-b border-gray-400 mb-2">
              Education
            </h2>
            {education.map((e, i) => (
              <div key={i} className="resume-template__entry mb-2 text-sm break-inside-avoid">
                <div className="resume-template__education-title font-bold">
                  {e.degree} — {e.school}
                </div>
                <div className="resume-template__dates text-xs text-gray-600">
                  {e.start} – {e.end}
                  {e.details ? ` · ${e.details}` : ''}
                </div>
              </div>
            ))}
          </section>
        )}

        {certifications?.length > 0 && (
          <section className="resume-template__section">
            <h2 className="resume-template__section-title text-sm font-bold uppercase tracking-wider border-b border-gray-400 mb-1">
              Certifications
            </h2>
            <ul className="resume-template__bullets list-disc pl-5 text-sm">
              {certifications.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  },
);
