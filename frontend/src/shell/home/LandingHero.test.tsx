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
      />,
    );

    expect(html).toContain('Start learning');
    expect(html).toContain('Browse tracks');
    expect(html).toContain('>Play<');
    expect(html).toContain('>Visualize<');
    expect(html).toContain('>Learn<');
    expect(html).toContain('Open dojo');
    expect(html).toContain('Vim Dojo');
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
      />,
    );

    expect(html).toContain('Resume learning');
    expect(html).toContain(lastItem.title);
    expect(html).toContain('Continue ·');
  });
});
