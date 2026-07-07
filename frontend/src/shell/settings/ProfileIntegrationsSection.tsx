import { useCallback, useEffect, useId, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { useAuth } from '@/shell/auth/AuthProvider';
import {
  getProfileIntegrations,
  updateProfileIntegrations,
  type ProfileIntegrations,
} from '@/platform/api/profileIntegrationsApi';

export function ProfileIntegrationsSection() {
  const keyInputId = useId();
  const { isAnonymous, loading } = useAuth();
  const [status, setStatus] = useState<ProfileIntegrations | null>(null);
  const [fetching, setFetching] = useState(true);
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setFetching(true);
    const data = await getProfileIntegrations();
    setStatus(data);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!loading && !isAnonymous) refresh();
    else setFetching(false);
  }, [loading, isAnonymous, refresh]);

  if (loading || isAnonymous) {
    return (
      <div className="profile-integrations-empty">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-panel2 text-ink3 shadow-theme-sm">
          <KeyRound className="h-5 w-5" />
        </span>
        <p className={cn('text-ink3', chromeText.sm)}>
          Sign in to manage your API keys and integrations.
        </p>
      </div>
    );
  }

  const save = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setError('Enter an API key to save');
      return;
    }
    setBusy(true);
    setError('');
    const res = await updateProfileIntegrations({ openaiApiKey: trimmed });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(res.data);
    setKeyInput('');
    setShowKey(false);
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    const res = await updateProfileIntegrations({ openaiApiKey: '' });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(res.data);
    setKeyInput('');
  };

  return (
    <section
      className="profile-integrations-card space-y-3 rounded-3xl border border-edge bg-panel/70 p-4 shadow-theme-sm"
      aria-label="OpenAI API key integration"
    >
      <div className="profile-integrations-card__head flex items-center gap-2">
        <span className="profile-integrations-card__icon grid h-9 w-9 place-items-center rounded-2xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
          <KeyRound className="h-4 w-4" />
        </span>
        <div>
          <span className="profile-integrations-card__eyebrow">secure integration</span>
          <h3 className={cn('font-semibold text-ink', chromeText.base)}>OpenAI API key</h3>
        </div>
      </div>
      <p className={cn('profile-integrations-card__copy text-ink3', chromeText.sm)}>
        Used for resume parsing and AI customization. Your key is encrypted on the server and never
        shown again after saving.{' '}
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Get a key
        </a>
      </p>

      {fetching ? (
        <div className="profile-integrations-loading flex items-center justify-center rounded-2xl border border-edge bg-panel/60 py-5">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      ) : (
        <>
          {status?.openai.configured && (
            <p
              className={cn(
                'profile-integrations-status rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-good',
                chromeText.sm,
              )}
            >
              Configured{status.openai.hint ? ` (…${status.openai.hint})` : ''}
            </p>
          )}

          <div className="profile-integrations-input-wrap relative">
            <label htmlFor={keyInputId} className="sr-only">
              OpenAI API key
            </label>
            <input
              id={keyInputId}
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={status?.openai.configured ? 'Enter new key to replace' : 'sk-...'}
              autoComplete="off"
              className={cn(
                'profile-integrations-input w-full rounded-2xl border border-edge bg-panel2 py-2 pl-3 pr-10 text-ink outline-none',
                'focus:border-accent/60 focus:ring-2 focus:ring-accent/15',
                chromeText.sm,
              )}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="profile-integrations-reveal absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink3 hover:bg-panel hover:text-ink"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="profile-integrations-actions flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className={cn(
                'profile-integrations-save flex-1 rounded-full bg-accent px-3 py-2 font-semibold text-[var(--accent-contrast)] shadow-theme-sm transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-theme-md disabled:translate-y-0 disabled:opacity-50',
                chromeText.sm,
              )}
            >
              {busy ? 'Saving…' : 'Save key'}
            </button>
            {status?.openai.configured && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className={cn(
                  'profile-integrations-remove inline-flex items-center gap-1 rounded-full border border-edge bg-panel2 px-3 py-2 text-ink2 shadow-theme-sm transition hover:border-bad/40 hover:text-bad disabled:opacity-50',
                  chromeText.sm,
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>

          {error && (
            <p className={cn('profile-integrations-error text-bad', chromeText.sm)}>{error}</p>
          )}
        </>
      )}
    </section>
  );
}
