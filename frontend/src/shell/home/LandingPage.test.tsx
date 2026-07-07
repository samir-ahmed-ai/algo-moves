/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { LandingPage } from './LandingPage';

const enterWorkspace = vi.fn();
const enterProblemInMode = vi.fn();
const enterCanvas = vi.fn();

vi.mock('@/store/workspace', () => ({
  useWorkspace: vi.fn(),
  readLastItemId: () => null,
}));

vi.mock('@/lib/utils/useMediaQuery', () => ({
  useIsMobile: () => true,
}));

vi.mock('@/store/persistence', () => ({
  useProgress: () => ({ stats: {}, mistakes: [] }),
}));

vi.mock('@/shell/auth/AuthButton', () => ({
  AuthButton: () => null,
}));

vi.mock('./LandingCatalog', () => ({
  LandingCatalogRail: () => null,
  LandingCatalogRoadmap: () => null,
}));

vi.mock('./SwipeModeQrPromo', () => ({
  SwipeModeQrPromo: () => null,
}));

import { useWorkspace } from '@/store/workspace';

const mockUseWorkspace = vi.mocked(useWorkspace);

function mockWorkspace() {
  mockUseWorkspace.mockReturnValue({
    theme: 'dark',
    setTheme: vi.fn(),
    palette: 'default',
    setPalette: vi.fn(),
    density: 'cozy',
    enterWorkspace,
    enterCanvas,
    enterProblemInMode,
    setActiveTrackId: vi.fn(),
    setActiveCategoryId: vi.fn(),
    setProblemFocused: vi.fn(),
    enterMobile: vi.fn(),
    enterVim: vi.fn(),
    enterGames: vi.fn(),
    enterPlans: vi.fn(),
    enterResumes: vi.fn(),
    enterCollabCanvas: vi.fn(),
  } as ReturnType<typeof useWorkspace>);
}

describe('LandingPage navigation', () => {
  const openSpy = vi.spyOn(window, 'open');

  beforeEach(() => {
    enterWorkspace.mockClear();
    enterProblemInMode.mockClear();
    enterCanvas.mockClear();
    openSpy.mockClear();
    mockWorkspace();
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('uses in-app workspace navigation instead of opening browser tabs', () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByTitle('Start learning'));
    expect(enterWorkspace).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('enters visualize mode in the same tab from the toolbar', () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByTitle('Visualize mode'));
    expect(enterCanvas).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });
});
