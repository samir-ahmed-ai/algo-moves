import { useCallback, useEffect, useState } from 'react';
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
      <p className={cn('text-ink3', chromeText.sm)}>
        Sign in to manage your API keys and integrations.
      </p>
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-accent" />
        <h3 className={cn('font-semibold text-ink', chromeText.base)}>OpenAI API key</h3>
      </div>
      <p className={cn('text-ink3', chromeText.sm)}>
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
        <Loader2 className="h-5 w-5 animate-spin text-ink3" />
      ) : (
        <>
          {status?.openai.configured && (
            <p
              className={cn(
                'rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-good',
                chromeText.sm,
              )}
            >
              Configured{status.openai.hint ? ` (…${status.openai.hint})` : ''}
            </p>
          )}

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={status?.openai.configured ? 'Enter new key to replace' : 'sk-...'}
              autoComplete="off"
              className={cn(
                'w-full rounded-lg border border-edge bg-panel2 py-2 pl-3 pr-10 text-ink outline-none',
                'focus:border-accent/60 focus:ring-2 focus:ring-accent/15',
                chromeText.sm,
              )}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink3 hover:text-ink"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className={cn(
                'flex-1 rounded-lg bg-accent px-3 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50',
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
                  'inline-flex items-center gap-1 rounded-lg border border-edge bg-panel2 px-3 py-2 text-ink2 transition hover:border-bad/40 hover:text-bad disabled:opacity-50',
                  chromeText.sm,
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>

          {error && <p className={cn('text-bad', chromeText.sm)}>{error}</p>}
        </>
      )}
    </div>
  );
}
