import { apiServerHttpBase } from '@/platform/api/config';

export interface ResumeContact {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
}

export interface ResumeBullet {
  text: string;
  tags: string[];
}

export interface ResumeSkill {
  name: string;
  category: string;
  tags: string[];
  weight: number;
}

export interface ResumeExperience {
  company: string;
  role: string;
  start: string;
  end: string;
  bullets: ResumeBullet[];
}

export interface ResumeProject {
  name: string;
  tags: string[];
  bullets: ResumeBullet[];
}

export interface ResumeEducation {
  school: string;
  degree: string;
  start: string;
  end: string;
  details: string;
}

export interface ResumeMapping {
  contact: ResumeContact;
  summary: string;
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  certifications: string[];
}

export interface Resume {
  id: string;
  ownerProfileId: string;
  title: string;
  originalFilename: string;
  contentType: string;
  mapping: ResumeMapping;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeSummary {
  id: string;
  title: string;
  originalFilename: string;
  isPublic: boolean;
  updatedAt: string;
}

export interface ResumeDirectoryEntry {
  id: string;
  title: string;
  originalFilename: string;
  updatedAt: string;
  ownerProfileId: string;
  ownerDisplayName: string;
  ownerAvatarSeed: string;
}

export interface ResumeVariant {
  id: string;
  resumeId: string;
  ownerProfileId: string;
  label: string;
  focus: string;
  targetRole: string;
  mode: 'rules' | 'ai';
  mapping: ResumeMapping;
  createdAt: string;
}

export interface CustomizeResult {
  resumeId: string;
  focus: string;
  targetRole: string;
  mode: 'rules' | 'ai';
  mapping: ResumeMapping;
  variant?: ResumeVariant;
}

async function resumesFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const headers = new Headers(init.headers);
  try {
    const res = await fetch(`${apiServerHttpBase()}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return { ok: false, error: body.error ?? `Request failed (${res.status})` };
    }
    if (res.status === 204) return { ok: true, data: null as T };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function listResumes(): Promise<ResumeSummary[]> {
  const res = await resumesFetch<ResumeSummary[]>('/api/resumes');
  return res.ok ? res.data : [];
}

export async function listResumeDirectory(): Promise<ResumeDirectoryEntry[]> {
  const res = await resumesFetch<ResumeDirectoryEntry[]>('/api/resumes/directory');
  return res.ok ? res.data : [];
}

export async function getResume(id: string): Promise<Resume | null> {
  const res = await resumesFetch<Resume>(`/api/resumes/${id}`);
  return res.ok ? res.data : null;
}

export async function uploadResume(
  file: File,
  opts?: { title?: string; isPublic?: boolean },
): Promise<{ ok: true; resume: Resume } | { ok: false; error: string }> {
  const form = new FormData();
  form.append('file', file);
  if (opts?.title) form.append('title', opts.title);
  if (opts?.isPublic === false) form.append('isPublic', 'false');

  try {
    const res = await fetch(`${apiServerHttpBase()}/api/resumes`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    const body = (await res.json().catch(() => ({}))) as Resume & { error?: string };
    if (!res.ok) {
      return { ok: false, error: body.error ?? `Upload failed (${res.status})` };
    }
    return { ok: true, resume: body };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function updateResume(
  id: string,
  patch: { title?: string; mapping?: ResumeMapping; isPublic?: boolean },
): Promise<Resume | null> {
  const res = await resumesFetch<Resume>(`/api/resumes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.ok ? res.data : null;
}

export async function deleteResume(id: string): Promise<boolean> {
  const res = await resumesFetch<{ ok: boolean }>(`/api/resumes/${id}`, { method: 'DELETE' });
  return res.ok && res.data?.ok === true;
}

export async function customizeResume(
  id: string,
  body: {
    focus: string;
    targetRole?: string;
    mode?: 'rules' | 'ai';
    save?: boolean;
    label?: string;
  },
): Promise<{ ok: true; result: CustomizeResult } | { ok: false; error: string }> {
  const res = await resumesFetch<CustomizeResult>(`/api/resumes/${id}/customize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, result: res.data };
}

export async function listResumeVariants(id: string): Promise<ResumeVariant[]> {
  const res = await resumesFetch<ResumeVariant[]>(`/api/resumes/${id}/variants`);
  return res.ok ? res.data : [];
}

export async function deleteResumeVariant(resumeId: string, variantId: string): Promise<boolean> {
  const res = await resumesFetch<{ ok: boolean }>(
    `/api/resumes/${resumeId}/variants/${variantId}`,
    {
      method: 'DELETE',
    },
  );
  return res.ok && res.data?.ok === true;
}
