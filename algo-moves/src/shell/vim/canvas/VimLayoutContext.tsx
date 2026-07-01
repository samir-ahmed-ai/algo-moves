import { createContext, useContext, type ReactNode } from 'react';
import { MAZE_CELL_SIZE } from './layout/mazeMetrics';

const VimLayoutContext = createContext(MAZE_CELL_SIZE);

export function VimLayoutProvider({ cellSize, children }: { cellSize: number; children: ReactNode }) {
  return <VimLayoutContext.Provider value={cellSize}>{children}</VimLayoutContext.Provider>;
}

export function useVimCellSize(): number {
  return useContext(VimLayoutContext);
}
