import { useEffect, useState } from 'react';
import { Home, Moon, Sun } from 'lucide-react';
import { FeatureSelectorPopover } from '@/components/shared';
import { BrandLogo } from '@/shell/BrandLogo';
import { AuthButton } from '@/shell/auth';
import { InstallAppBanner } from './install/InstallAppBanner';
import { usePwaInstall } from './install/usePwaInstall';
import { catalog, categoryIdFromBrowseTopic, topicForCategory, type Topic } from '../../content';
import { useWorkspace } from '@/store/workspace';
import { MobileBrowse } from './MobileBrowse';
import { MobileDeck } from './deck/MobileDeck';
import { isMobileHash, parseMobileHash, writeMobileHash } from '@/lib/navigation';

interface DeckTarget {
  topic: Topic;
  startItemId?: string;
  initialPIdx?: number;
  initialCIdx?: number;
}

function resolveTopic(parsed: ReturnType<typeof parseMobileHash>): Topic | undefined {
  if (!parsed) return undefined;
  if (parsed.categoryId) return topicForCategory(parsed.categoryId, catalog);
  if (parsed.topicId) {
    if (parsed.topicId.startsWith('browse-')) {
      const catId = categoryIdFromBrowseTopic(parsed.topicId);
      return catId ? topicForCategory(catId, catalog) : undefined;
    }
    return catalog.getTopic(parsed.topicId);
  }
  return undefined;
}

function targetFromHash(): DeckTarget | null {
  if (typeof location === 'undefined') return null;
  const parsed = parseMobileHash(location.hash, location.pathname);
  if (!parsed?.itemId && !parsed?.categoryId && !parsed?.topicId) return null;
  const topic = resolveTopic(parsed);
  if (!topic) return null;
  if (parsed.itemId) return { topic, startItemId: parsed.itemId };
  return { topic };
}

function browseFromHash(): { trackId?: string; categoryId?: string } | null {
  if (typeof location === 'undefined') return null;
  const parsed = parseMobileHash(location.hash, location.pathname);
  if (!parsed || parsed.itemId) return null;
  if (parsed.trackId || parsed.categoryId) {
    return { trackId: parsed.trackId, categoryId: parsed.categoryId };
  }
  return null;
}

/**
 * Mobile Mode — a full-screen, story-style swipe deck for drilling problems.
 * Reached via `route === 'mobile'`; renders a centred phone column on desktop so
 * it's usable (and testable) at any width.
 */
export function MobileApp() {
  const {
    theme,
    setTheme,
    density,
    goHome,
    activeTopicId,
    setActiveTopicId,
    activeTrackId,
    setActiveTrackId,
    activeCategoryId,
    setActiveCategoryId,
  } = useWorkspace();

  const installState = usePwaInstall();
  const [installDismissed, setInstallDismissed] = useState(false);

  const [target, setTarget] = useState<DeckTarget | null>(() => {
    const fromHash = targetFromHash();
    if (fromHash) return fromHash;
    if (activeTopicId) {
      const t = resolveTopic({ topicId: activeTopicId });
      if (t) return { topic: t };
    }
    return null;
  });

  useEffect(() => {
    const browse = browseFromHash();
    if (browse?.trackId) setActiveTrackId(browse.trackId as typeof activeTrackId);
    if (browse?.categoryId) setActiveCategoryId(browse.categoryId);
  }, [setActiveTrackId, setActiveCategoryId]);

  useEffect(() => {
    const syncFromHash = () => {
      const fromHash = targetFromHash();
      if (fromHash) {
        setActiveTopicId(fromHash.topic.id);
        setTarget(fromHash);
        return;
      }
      const browse = browseFromHash();
      if (browse) {
        setTarget(null);
        if (browse.trackId) setActiveTrackId(browse.trackId as typeof activeTrackId);
        if (browse.categoryId !== undefined) setActiveCategoryId(browse.categoryId ?? null);
        setActiveTopicId(null);
      } else if (isMobileHash(location.hash, location.pathname)) {
        setActiveTopicId(null);
        setActiveTrackId(null);
        setActiveCategoryId(null);
        setTarget(null);
      }
    };
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('popstate', syncFromHash);
    };
  }, [setActiveTopicId, setActiveTrackId, setActiveCategoryId]);

  const pick = (topic: Topic, startItemId?: string, initialPIdx?: number, initialCIdx?: number) => {
    setActiveTopicId(topic.id);
    const catId = categoryIdFromBrowseTopic(topic.id);
    if (catId) {
      setActiveCategoryId(catId);
      const track = activeTrackId ?? 'interview-prep';
      setActiveTrackId(track);
      writeMobileHash(
        { trackId: track, categoryId: catId, itemId: startItemId },
        { replace: false },
      );
    } else {
      writeMobileHash({ topicId: topic.id, itemId: startItemId }, { replace: false });
    }
    setTarget({
      topic,
      ...(startItemId !== undefined ? { startItemId } : {}),
      ...(initialPIdx !== undefined ? { initialPIdx } : {}),
      ...(initialCIdx !== undefined ? { initialCIdx } : {}),
    });
  };

  const exitDeck = () => {
    setActiveTopicId(null);
    setTarget(null);
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      const catId = activeCategoryId;
      const track = activeTrackId;
      writeMobileHash(
        catId && track ? { trackId: track, categoryId: catId } : track ? { trackId: track } : null,
        {
          replace: true,
        },
      );
    }
  };

  const goTopic = (topicId: string) => {
    const catId = categoryIdFromBrowseTopic(topicId);
    const t = catId ? topicForCategory(catId, catalog) : catalog.getTopic(topicId);
    if (t) {
      setActiveTopicId(topicId);
      setTarget({ topic: t, initialPIdx: 0, initialCIdx: 0 });
      if (catId && activeTrackId)
        writeMobileHash({ trackId: activeTrackId, categoryId: catId }, { replace: false });
      else writeMobileHash({ topicId }, { replace: false });
    }
  };

  const ThemeBtn = (
    <FeatureSelectorPopover
      groups={[
        {
          options: [
            {
              id: 'light',
              icon: <Sun />,
              title: 'Light',
              subtitle: 'Light background',
              detailTitle: 'Light Theme',
              detailDescription: 'Light background with dark text.',
            },
            {
              id: 'dark',
              icon: <Moon />,
              title: 'Dark',
              subtitle: 'Dark background',
              detailTitle: 'Dark Theme',
              detailDescription: 'Dark background with light text.',
            },
          ],
        },
      ]}
      value={theme}
      onChange={(v) => setTheme(v as 'light' | 'dark')}
      panelTitle="Theme"
      triggerIcon={theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      triggerAriaLabel="Theme"
      compact
      align="right"
    />
  );

  return (
    <div
      data-density={density}
      data-surface="mobile"
      className="mobile-app-shell relative isolate flex h-full w-full justify-center overflow-hidden bg-bg text-ink"
      aria-label="Mobile swipe practice"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--accent)_24%,transparent),transparent_26rem),radial-gradient(circle_at_90%_86%,rgba(248,214,121,0.12),transparent_24rem)]"
      />
      <div className="mobile-frame relative flex h-full w-full max-w-[480px] flex-col overflow-hidden border-edge bg-[var(--surface-glass)] shadow-[0_0_80px_hsl(0_0%_0%_/_0.22)] backdrop-blur sm:border-x">
        {target ? (
          <MobileDeck
            key={`${target.topic.id}:${target.startItemId ?? ''}:${target.initialPIdx ?? ''}:${target.initialCIdx ?? ''}`}
            topic={target.topic}
            {...(target.startItemId !== undefined ? { startItemId: target.startItemId } : {})}
            {...(target.initialPIdx !== undefined ? { initialPIdx: target.initialPIdx } : {})}
            {...(target.initialCIdx !== undefined ? { initialCIdx: target.initialCIdx } : {})}
            onExit={exitDeck}
            onGoTopic={goTopic}
            headerRight={ThemeBtn}
          />
        ) : (
          <>
            <header className="z-10 flex shrink-0 items-center gap-2 border-b border-edge bg-[var(--surface-glass)] px-3 py-2.5 shadow-[0_1px_0_color-mix(in_srgb,var(--border)_55%,transparent)] backdrop-blur-xl">
              <button
                type="button"
                onClick={goHome}
                className="grid h-8 w-8 place-items-center rounded-full text-ink3 hover:bg-panel2 hover:text-ink"
                title="Home"
                aria-label="Return to landing page"
              >
                <Home className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5">
                <BrandLogo size="sm" />
                <span className="min-w-0 text-center">
                  <span className="block text-[length:var(--fs)] font-semibold leading-tight">
                    Algo Moves
                  </span>
                  <span className="block text-[length:var(--fs-2xs)] font-medium uppercase tracking-[0.14em] text-ink3">
                    swipe practice
                  </span>
                </span>
              </div>
              {ThemeBtn}
              <AuthButton compact />
            </header>
            {!installDismissed && (
              <InstallAppBanner state={installState} onDismiss={() => setInstallDismissed(true)} />
            )}
            <MobileBrowse onPick={pick} />
          </>
        )}
      </div>
    </div>
  );
}
