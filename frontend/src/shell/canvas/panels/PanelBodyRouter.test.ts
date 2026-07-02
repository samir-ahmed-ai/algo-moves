import { describe, expect, it } from 'vitest';
import { PANEL_BODIES } from './PanelBodyRouter';
import { getPanelConfig } from '@/core/panelRegistry';

describe('PANEL_BODIES registry', () => {
  it('every registered body maps to a known panel id in panelsConfig', () => {
    const unknown = Object.keys(PANEL_BODIES).filter((id) => !getPanelConfig(id));
    expect(unknown, `body keys with no panelsConfig entry: ${unknown.join(', ')}`).toEqual([]);
  });
});
