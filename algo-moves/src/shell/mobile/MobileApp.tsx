import { useEffect, useState } from 'react';
import { Home, Moon, Sparkles, Sun } from 'lucide-react';
import { catalog, type Topic } from '../../content';
import { useWorkspace } from '../../lib/workspace';
import { MobileBrowse } from './MobileBrowse';
import { MobileDeck } from './MobileDeck';
import { parseMobileHash, writeMobileHash } from './mobileHash';

interface DeckTarget {
  topic: Topic;
  startItemId?: string;
  initialPIdx?: number;
  initialCIdx?: number;
}

function targetFromHash(): DeckTarget | null {
  if (typeof location === 'undefined') return null;
  const parsed = parseMobileHash(location.hash);
  if (!parsed?.topicId) return null;
  const topic = catalog.getTopic(parsed.topicId);
  if (!topic) return null;
  return { topic, startItemId: parsed.itemId };
}

/**
 * Mobile Mode — a full-screen, story-style swipe deck for drilling problems.
 * Reached via `route === 'mobile'`; renders a centred phone column on desktop so
 * it's usable (and testable) at any width.
 */
export function MobileApp() {
  const { theme, setTheme, density, goHome, activeTopicId, setActiveTopicId } = useWorkspace();

  const [target, setTarget] = useState<DeckTarget | null>(() => {
    const fromHash = targetFromHash();
    if (fromHash) return fromHash;
    if (activeTopicId) {
      const t = catalog.getTopic(activeTopicId);
      if (t) return { topic: t };
    }
    return null;
  });

  useEffect(() => {
    const syncFromHash = () => {
      const fromHash = targetFromHash();
      if (fromHash) {
        setActiveTopicId(fromHash.topic.id);
        setTarget(fromHash);
      } else if (location.hash.startsWith('#mobile')) {
        setActiveTopicId(null);
        setTarget(null);
      }
    };
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('popstate', syncFromHash);
    };
  }, [setActiveTopicId]);

  const pick = (topic: Topic, startItemId?: string, initialPIdx?: number, initialCIdx?: number) => {
    setActiveTopicId(topic.id);
    setTarget({ topic, startItemId, initialPIdx, initialCIdx });
    writeMobileHash({ topicId: topic.id, itemId: startItemId }, { replace: false });
  };

  const exitDeck = () => {
    setActiveTopicId(null);
    setTarget(null);
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      writeMobileHash(null, { replace: true });
    }
  };

  const goTopic = (topicId: string) => {
    const t = catalog.getTopic(topicId);
    if (t) {
      setActiveTopicId(topicId);
      setTarget({ topic: t, initialPIdx: 0, initialCIdx: 0 });
      writeMobileHash({ topicId }, { replace: false });
    }
  };

  const ThemeBtn = (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="grid h-8 w-8 place-items-center rounded-full text-ink3 hover:bg-panel2 hover:text-ink"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );

  return (
    <div data-density={density} className="flex h-full w-full justify-center bg-bg text-ink">
      <div className="mobile-frame relative flex h-full w-full max-w-[480px] flex-col overflow-hidden border-edge bg-bg sm:border-x">
        {target ? (
          <MobileDeck
            key={`${target.topic.id}:${target.startItemId ?? ''}:${target.initialPIdx ?? ''}:${target.initialCIdx ?? ''}`}
            topic={target.topic}
            startItemId={target.startItemId}
            initialPIdx={target.initialPIdx}
            initialCIdx={target.initialCIdx}
            onExit={exitDeck}
            onGoTopic={goTopic}
            headerRight={ThemeBtn}
          />
        ) : (
          <>
            <header className="flex shrink-0 items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={goHome}
                className="grid h-8 w-8 place-items-center rounded-full text-ink3 hover:bg-panel2 hover:text-ink"
                title="Home"
              >
                <Home className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="text-[14px] font-semibold tracking-tight">Algo Moves</span>
              </div>
              {ThemeBtn}
            </header>
            <MobileBrowse onPick={pick} />
          </>
        )}
      </div>
    </div>
  );
}
