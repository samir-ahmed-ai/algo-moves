import { nodeText } from '@/design/typography';

export type HeaderDensity = 'compact' | 'ultra' | 'spacious';

export const HEADER_PAD: Record<HeaderDensity, string> = {
  compact: 'px-0 py-[var(--node-py,0.5625rem)] gap-[var(--node-gap,0.5rem)]',
  ultra: 'px-0 py-[calc(var(--node-py,0.5625rem)*0.85)] gap-[calc(var(--node-gap,0.5rem)*0.85)]',
  spacious: 'px-0 py-[calc(var(--node-py,0.5625rem)*1.15)] gap-[calc(var(--node-gap,0.5rem)*1.1)]',
};

export const HEADER_ICON: Record<HeaderDensity, string> = {
  compact:
    'grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)] shrink-0 place-items-center [&>*]:size-[var(--node-icon-glyph)]',
  ultra:
    'grid h-[calc(var(--node-icon,1.125rem)*0.9)] w-[calc(var(--node-icon,1.125rem)*0.9)] shrink-0 place-items-center [&>*]:size-[var(--node-icon-glyph)]',
  spacious:
    'grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)] shrink-0 place-items-center [&>*]:size-[var(--node-icon,1.125rem)]',
};

export const HEADER_TITLE: Record<HeaderDensity, string> = {
  compact: nodeText.title,
  ultra: nodeText.title,
  spacious: nodeText.title,
};

export const BODY_PAD: Record<HeaderDensity, string> = {
  compact: 'px-0 py-0',
  ultra: 'px-0 py-0',
  spacious: 'px-0 py-0',
};

export const BODY_PAD_NARROW: Record<HeaderDensity, string> = {
  compact: 'px-0 py-0',
  ultra: 'px-0 py-0',
  spacious: 'px-0 py-0',
};
