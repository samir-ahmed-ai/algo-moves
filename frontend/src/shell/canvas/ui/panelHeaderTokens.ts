import { nodeText } from '@/design/typography';

export type HeaderDensity = 'compact' | 'ultra' | 'spacious';

export const HEADER_PAD: Record<HeaderDensity, string> = {
  compact:
    'panel-header-pad panel-header-pad--compact px-0 py-[var(--node-py,0.5625rem)] gap-[var(--node-gap,0.5rem)]',
  ultra:
    'panel-header-pad panel-header-pad--ultra px-0 py-[calc(var(--node-py,0.5625rem)*0.85)] gap-[calc(var(--node-gap,0.5rem)*0.85)]',
  spacious:
    'panel-header-pad panel-header-pad--spacious px-0 py-[calc(var(--node-py,0.5625rem)*1.15)] gap-[calc(var(--node-gap,0.5rem)*1.1)]',
};

export const HEADER_ICON: Record<HeaderDensity, string> = {
  compact:
    'panel-header-icon panel-header-icon--compact grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)] shrink-0 place-items-center [&>*]:size-[var(--node-icon-glyph)]',
  ultra:
    'panel-header-icon panel-header-icon--ultra grid h-[calc(var(--node-icon,1.125rem)*0.9)] w-[calc(var(--node-icon,1.125rem)*0.9)] shrink-0 place-items-center [&>*]:size-[var(--node-icon-glyph)]',
  spacious:
    'panel-header-icon panel-header-icon--spacious grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)] shrink-0 place-items-center [&>*]:size-[var(--node-icon,1.125rem)]',
};

export const HEADER_TITLE: Record<HeaderDensity, string> = {
  compact: `panel-header-title panel-header-title--compact ${nodeText.title}`,
  ultra: `panel-header-title panel-header-title--ultra ${nodeText.title}`,
  spacious: `panel-header-title panel-header-title--spacious ${nodeText.title}`,
};

export const BODY_PAD: Record<HeaderDensity, string> = {
  compact: 'panel-body-pad panel-body-pad--compact px-0 py-0',
  ultra: 'panel-body-pad panel-body-pad--ultra px-0 py-0',
  spacious: 'panel-body-pad panel-body-pad--spacious px-0 py-0',
};

export const BODY_PAD_NARROW: Record<HeaderDensity, string> = {
  compact: 'panel-body-pad panel-body-pad--narrow panel-body-pad--compact px-0 py-0',
  ultra: 'panel-body-pad panel-body-pad--narrow panel-body-pad--ultra px-0 py-0',
  spacious: 'panel-body-pad panel-body-pad--narrow panel-body-pad--spacious px-0 py-0',
};
