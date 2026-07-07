import type {
  ResumeBullet,
  ResumeExperience,
  ResumeMapping,
  ResumeProject,
  ResumeSkill,
} from '../data/resumesApi';

function tagScore(tags: string[], name: string, focus: string): number {
  let score = 0;
  const lowerName = name.toLowerCase();
  if (lowerName.includes(focus)) score += 2;
  for (const t of tags) {
    const lt = t.toLowerCase();
    if (lt === focus || lt.includes(focus)) score += 3;
  }
  return score;
}

function bulletScore(b: ResumeBullet, focus: string): number {
  let score = 0;
  if (b.text.toLowerCase().includes(focus)) score += 2;
  for (const t of b.tags) {
    const lt = t.toLowerCase();
    if (lt === focus || lt.includes(focus)) score += 3;
  }
  return score;
}

function expScore(e: ResumeExperience, focus: string): number {
  let score = 0;
  if (e.role.toLowerCase().includes(focus)) score += 2;
  for (const b of e.bullets) score += bulletScore(b, focus);
  return score;
}

function projectScore(p: ResumeProject, focus: string): number {
  let score = 0;
  if (p.name.toLowerCase().includes(focus)) score += 2;
  for (const t of p.tags) {
    if (t.toLowerCase().includes(focus)) score += 2;
  }
  for (const b of p.bullets) score += bulletScore(b, focus);
  return score;
}

/** Rule-based reorder/emphasis for a focus keyword (mirrors backend logic). */
export function reorderMappingForFocus(mapping: ResumeMapping, focus: string): ResumeMapping {
  const f = focus.toLowerCase().trim();
  if (!f) return mapping;

  const skills: ResumeSkill[] = mapping.skills
    .map((s) => ({ ...s, weight: s.weight + tagScore(s.tags, s.name, f) * 2 }))
    .sort((a, b) => b.weight - a.weight);

  const experience: ResumeExperience[] = mapping.experience
    .map((e) => ({
      ...e,
      bullets: [...e.bullets].sort((a, b) => bulletScore(b, f) - bulletScore(a, f)),
    }))
    .sort((a, b) => expScore(b, f) - expScore(a, f));

  const projects: ResumeProject[] = mapping.projects
    .map((p) => ({
      ...p,
      bullets: [...p.bullets].sort((a, b) => bulletScore(b, f) - bulletScore(a, f)),
    }))
    .sort((a, b) => projectScore(b, f) - projectScore(a, f));

  return { ...mapping, skills, experience, projects };
}

export const FOCUS_PRESETS = [
  { focus: 'java', label: 'Java Developer', role: 'Senior Java Engineer' },
  { focus: 'python', label: 'Python Developer', role: 'Python Backend Engineer' },
  { focus: 'react', label: 'Frontend React', role: 'React Frontend Engineer' },
  { focus: 'aws', label: 'Cloud / AWS', role: 'Cloud Engineer' },
  { focus: 'go', label: 'Go Developer', role: 'Go Backend Engineer' },
  { focus: 'kubernetes', label: 'DevOps / K8s', role: 'Platform Engineer' },
] as const;
