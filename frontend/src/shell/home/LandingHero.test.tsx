import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { catalog } from '@/content';
import type { ProgressData } from '@/store/persistence';
import { LandingHero } from './LandingHero';

const emptyProgress: ProgressData = { stats: {}, mistakes: [] };
const firstProblem = catalog.items.find((i) => i.kind === 'problem');

const noop = () => {};

describe('LandingHero CTAs', () => {
  it('renders primary hero actions for first-time visitors', () => {
    const html = renderToStaticMarkup(
      <LandingHero
        problems={catalog.items.filter((i) => i.kind === 'problem').slice(0, 8)}
        firstProblem={firstProblem}
        progress={emptyProgress}
        isMobile={false}
        onOpenItem={noop}
        onBrowseTrack={noop}
        onStartIn={noop}
        onSwipe={noop}
        onVim={noop}
        onGames={noop}
        onPlans={noop}
        onResumes={noop}
        onInterviewCanvas={noop}
      />,
    );

    expect(html).toContain('Start learning');
    expect(html).toContain('Browse tracks');
    expect(html).toContain('>Play<');
    expect(html).toContain('>Learn<');
    expect(html).toContain('>Swipe<');
    expect(html).toContain('>Games<');
    expect(html).toContain('>Vim Dojo<');
    expect(html).toContain('>Plans<');
    expect(html).toContain('>Resumes<');
    expect(html).toContain('>Interview Canvas<');
    expect(html).toContain('Whiteboard + code studio');
    expect(html).toContain('>Interview<');
    expect(html).toContain('>Games &amp; drills<');
    expect(html).toContain('8 ways to practice');
  });

  it('renders resume CTA when a last item is present', () => {
    const lastItem = firstProblem;
    if (!lastItem) return;

    const html = renderToStaticMarkup(
      <LandingHero
        problems={[lastItem]}
        lastItem={lastItem}
        progress={emptyProgress}
        isMobile={false}
        onOpenItem={vi.fn()}
        onBrowseTrack={noop}
        onStartIn={noop}
        onSwipe={noop}
        onVim={noop}
        onGames={noop}
        onPlans={noop}
        onResumes={noop}
        onInterviewCanvas={noop}
      />,
    );

    expect(html).toContain('Resume learning');
    expect(html).toContain(lastItem.title);
    expect(html).toContain('Continue ·');
  });
});
