import { apiServerHttpBase } from './config';

export interface OpenAIIntegrationStatus {
  configured: boolean;
  hint?: string;
}

export interface ProfileIntegrations {
  openai: OpenAIIntegrationStatus;
}

export async function getProfileIntegrations(): Promise<ProfileIntegrations | null> {
  try {
    const res = await fetch(`${apiServerHttpBase()}/api/profiles/me/integrations`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await res.json()) as ProfileIntegrations;
  } catch {
    return null;
  }
}

export async function updateProfileIntegrations(patch: {
  openaiApiKey?: string | null;
}): Promise<{ ok: true; data: ProfileIntegrations } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${apiServerHttpBase()}/api/profiles/me/integrations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    const body = (await res.json().catch(() => ({}))) as ProfileIntegrations & { error?: string };
    if (!res.ok) {
      return { ok: false, error: body.error ?? `Request failed (${res.status})` };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}
