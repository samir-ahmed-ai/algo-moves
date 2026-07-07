import { useEffect, useId, useState } from 'react';
import { X, Settings, Cloud, CloudOff } from 'lucide-react';
import {
  useWorkspace,
  saveDefaults,
  type WorkspaceDefaults,
  type Density,
  type Theme,
  type SettingsTab,
} from '@/store/workspace';
import { THEME_META, type ThemePreset } from '../../../styles/themes/registry';
import {
  LAYOUT_PRESETS,
  type LayoutPreset,
  type BgVariant,
  type EdgePathType,
} from '../layout/layout';
import { Toggle } from '../../ui';
import { Field, RADIUS_CTRL } from './nodeui';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../../chromeUi';
import { ProfileIntegrationsSection } from '@/shell/settings/ProfileIntegrationsSection';
import { useAuth } from '@/shell/auth';
import { saveUserSettings } from '@/shell/settings/useUserSettingsSync';

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="settings-segmented flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            `settings-segmented__button ${RADIUS_CTRL} border px-1.5 py-0.5 font-medium transition-colors`,
            value === o.v
              ? 'border-accent bg-accentbg text-accent'
              : 'border-edge text-ink2 hover:text-ink',
            value === o.v && 'is-active',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'profile', label: 'Profile' },
];

export function SettingsDialog() {
  const titleId = useId();
  const ws = useWorkspace();
  const {
    settingsOpen,
    setSettingsOpen,
    settingsTab,
    setSettingsTab,
    theme,
    setTheme,
    palette,
    setPalette,
    density,
    setDensity,
    themePreset,
    setThemePreset,
    layoutPreset,
    setLayoutPreset,
    tweaks,
    toggleTweak,
    canvasHud,
  } = ws;
  const { isAnonymous } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, setSettingsOpen]);

  // Reset feedback state each time dialog opens
  useEffect(() => {
    if (settingsOpen) setSavedToCloud(false);
  }, [settingsOpen]);

  if (!settingsOpen) return null;

  const persist = async () => {
    setSaving(true);
    try {
      if (!isAnonymous) {
        const ok = await saveUserSettings(isAnonymous, {
          theme,
          palette,
          density,
          themePreset,
          layoutPreset,
          tweaks,
        });
        if (ok) setSavedToCloud(true);
      }
      // Always persist locally too as a fallback
      const d: WorkspaceDefaults = {
        density,
        themePreset,
        layoutPreset,
        autoplay: tweaks.controls,
        snap: canvasHud?.snap ?? false,
      };
      saveDefaults(d);
      if (isAnonymous) setSettingsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="settings-dialog-backdrop fixed inset-0 z-[60] grid place-items-center bg-bg/70 p-4 backdrop-blur-md"
      onClick={() => setSettingsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="settings-dialog w-[440px] max-w-[92vw] overflow-hidden rounded-3xl border border-edge bg-[var(--surface-glass)] shadow-theme-xl ring-1 ring-accent/10 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-dialog__header flex items-center gap-2 border-b border-edge bg-panel/40 px-4 py-3">
          <span className="settings-dialog__icon grid h-9 w-9 place-items-center rounded-2xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
            <Settings className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className={cn('font-semibold text-ink', chromeText.base)}>
              Settings
            </h2>
            <p className={cn('truncate text-ink3', chromeText.xs)}>
              Tune appearance, profile, and workspace defaults.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="settings-dialog__close grid h-8 w-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
            aria-label="Close settings"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="settings-dialog__tabs flex gap-1 border-b border-edge bg-panel/20 px-3 py-2">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSettingsTab(tab.id)}
              className={cn(
                `settings-dialog__tab ${RADIUS_CTRL} px-2.5 py-1 font-medium transition`,
                settingsTab === tab.id
                  ? 'bg-accentbg text-accent'
                  : 'text-ink2 hover:bg-panel2 hover:text-ink',
                settingsTab === tab.id && 'is-active',
                chromeText.sm,
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-dialog__body ws-scroll max-h-[70vh] space-y-3 overflow-y-auto p-3">
          {settingsTab === 'profile' ? (
            <ProfileIntegrationsSection />
          ) : (
            <>
              <div className="settings-dialog__section">
                <Field label="Theme">
                  <Segmented<Theme>
                    value={theme}
                    onChange={setTheme}
                    options={[
                      { v: 'light', label: 'Light' },
                      { v: 'dark', label: 'Dark' },
                    ]}
                  />
                </Field>
              </div>

              <div className="settings-dialog__section">
                <Toggle
                  label="Color-blind mode"
                  checked={palette === 'cb'}
                  onChange={() => setPalette(palette === 'cb' ? 'default' : 'cb')}
                />
              </div>

              <div className="settings-dialog__section">
                <Field label="Density">
                  <Segmented<Density>
                    value={density}
                    onChange={setDensity}
                    options={[
                      { v: 'ultra', label: 'Ultra' },
                      { v: 'compact', label: 'Compact' },
                      { v: 'spacious', label: 'Spacious' },
                    ]}
                  />
                </Field>
              </div>

              <div className="settings-dialog__section">
                <Field label="Theme preset">
                  <div className="grid max-h-[160px] grid-cols-2 gap-1 overflow-y-auto">
                    {THEME_META.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setThemePreset(t.id as ThemePreset)}
                        className={cn(
                          `flex items-center gap-1.5 border px-2 py-1 text-left ${RADIUS_CTRL}`,
                          themePreset === t.id
                            ? 'border-accent bg-accentbg'
                            : 'border-edge hover:border-accent/40',
                        )}
                      >
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-edge"
                          style={{ background: t.swatch }}
                        />
                        <span className="truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="settings-dialog__section">
                <Field label="Default layout preset">
                  <Segmented<LayoutPreset>
                    value={layoutPreset}
                    onChange={setLayoutPreset}
                    options={LAYOUT_PRESETS.map((p) => ({ v: p, label: p }))}
                  />
                </Field>
              </div>

              {canvasHud && (
                <>
                  <div className="settings-dialog__section">
                    <Field label="Edge style">
                      <Segmented<EdgePathType>
                        value={canvasHud.edgeOpts.pathType}
                        onChange={(v) => canvasHud.setEdgeOpts((o) => ({ ...o, pathType: v }))}
                        options={[
                          { v: 'bezier', label: 'Bezier' },
                          { v: 'smoothstep', label: 'Smooth' },
                          { v: 'step', label: 'Step' },
                          { v: 'straight', label: 'Straight' },
                        ]}
                      />
                    </Field>
                  </div>
                  <div className="settings-dialog__section">
                    <Field label="Canvas background">
                      <Segmented<BgVariant>
                        value={canvasHud.bg}
                        onChange={canvasHud.setBg}
                        options={[
                          { v: 'dots', label: 'Dots' },
                          { v: 'lines', label: 'Lines' },
                          { v: 'cross', label: 'Cross' },
                          { v: 'none', label: 'None' },
                        ]}
                      />
                    </Field>
                  </div>
                  <div className="settings-dialog__section">
                    <Toggle
                      label="Snap to grid"
                      checked={canvasHud.snap}
                      onChange={canvasHud.setSnap}
                    />
                  </div>
                </>
              )}

              <div className="settings-dialog__section settings-dialog__section--toggles -mx-1 border-t border-edge pt-3">
                <Toggle
                  label="Sound cues"
                  checked={tweaks.sound}
                  onChange={() => toggleTweak('sound')}
                />
                <Toggle
                  label="Narration"
                  checked={tweaks.narrate}
                  onChange={() => toggleTweak('narrate')}
                />
                <Toggle
                  label="Animations"
                  checked={tweaks.animate}
                  onChange={() => toggleTweak('animate')}
                />
              </div>
            </>
          )}
        </div>

        {settingsTab === 'appearance' && (
          <footer className="settings-dialog__footer flex items-center gap-2 border-t border-edge px-3 py-2">
            {!isAnonymous && (
              <span
                className={cn(
                  'mr-auto flex items-center gap-1 transition-opacity',
                  chromeText.xs,
                  savedToCloud ? 'text-accent opacity-100' : 'text-ink3 opacity-70',
                )}
              >
                {savedToCloud ? (
                  <>
                    <Cloud className="h-3 w-3" />
                    Synced to your account
                  </>
                ) : (
                  <>
                    <Cloud className="h-3 w-3" />
                    Saves to your account
                  </>
                )}
              </span>
            )}
            {isAnonymous && (
              <span className={cn('mr-auto flex items-center gap-1 text-ink3', chromeText.xs)}>
                <CloudOff className="h-3 w-3" />
                Sign in to sync across devices
              </span>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className={cn(
                `settings-dialog__cancel px-2.5 py-1 text-ink2 hover:bg-panel2 ${RADIUS_CTRL}`,
                chromeText.sm,
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={persist}
              disabled={saving}
              className={cn(
                `settings-dialog__save bg-accent px-2.5 py-1 font-medium text-[var(--accent-contrast)] shadow-theme-sm hover:opacity-90 disabled:opacity-60 ${RADIUS_CTRL}`,
                chromeText.sm,
              )}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
