import { cn } from '../../lib/cn';
import { chromeText } from '../chromeUi';
import { useEffect } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { Maximize, LayoutGrid, ZoomIn, ZoomOut } from 'lucide-react';
import { CSS_CHROME_BOTTOM_DOCK, CSS_CHROME_BOTTOM_RAIL } from '../chrome';
import { useWorkspace, type CanvasZoomApi } from '../../lib/workspace';
import { HudBtn } from './CanvasTools';
import { GlobalTransportBar } from './GlobalTransportBar';

const ZOOM_SHELL =
  'flex rounded-lg border border-edge bg-panel/95 p-0.5 shadow-[var(--shadow-lg)] backdrop-blur';

function ZoomControls({
  zoom,
  zoomIn,
  zoomOut,
  onFit,
  onTidy,
  onResetZoom,
  vertical,
}: CanvasZoomApi & { onTidy: () => void; onResetZoom: () => void; vertical?: boolean }) {
  return (
    <div
      className={
        vertical
          ? `${ZOOM_SHELL} flex-col items-center gap-0.5`
          : `${ZOOM_SHELL} items-center gap-0.5`
      }
    >
      <HudBtn nodrag variant="solid" onClick={zoomOut} title="Zoom out">
        <ZoomOut className="h-3 w-3" />
      </HudBtn>
      <button
        type="button"
        onClick={onResetZoom}
        title="Reset to 100%"
        className={cn('min-w-[2.25rem] rounded px-0.5 text-center font-mono tabular-nums text-ink3 transition-colors hover:bg-panel2 hover:text-ink', chromeText.sm)}
      >
        {Math.round(zoom * 100)}%
      </button>
      <HudBtn nodrag variant="solid" onClick={zoomIn} title="Zoom in">
        <ZoomIn className="h-3 w-3" />
      </HudBtn>
      <span className={vertical ? 'my-px h-px w-3 bg-edge' : 'mx-px h-3 w-px bg-edge'} />
      <HudBtn nodrag variant="solid" onClick={onFit} title="Fit view">
        <Maximize className="h-3 w-3" />
      </HudBtn>
      <HudBtn nodrag variant="solid" onClick={onTidy} title="Tidy layout">
        <LayoutGrid className="h-3 w-3" />
      </HudBtn>
    </div>
  );
}

/** Syncs React Flow zoom state into workspace for the collapsed sidebar rail. */
export function CanvasZoomBridge({ onFit }: { onFit: () => void }) {
  const { zoomIn, zoomOut, setViewport, getViewport } = useReactFlow();
  const { zoom } = useViewport();
  const { setCanvasZoom } = useWorkspace();

  useEffect(() => {
    setCanvasZoom({
      zoom,
      zoomIn: () => zoomIn({ duration: 200 }),
      zoomOut: () => zoomOut({ duration: 200 }),
      onFit,
      onResetZoom: () => {
        const vp = getViewport();
        setViewport({ ...vp, zoom: 1 }, { duration: 200 });
      },
    });
    return () => setCanvasZoom(null);
  }, [zoom, zoomIn, zoomOut, onFit, setCanvasZoom, setViewport, getViewport]);

  return null;
}

export function SidebarZoomControls({
  zoomApi,
  onTidy,
  vertical = true,
}: {
  zoomApi: CanvasZoomApi;
  onTidy: () => void;
  vertical?: boolean;
}) {
  return (
    <ZoomControls {...zoomApi} onTidy={onTidy} onResetZoom={zoomApi.onResetZoom} vertical={vertical} />
  );
}

/** Bottom-centre transport only — zoom controls live in the left sidebar. */
export function CanvasFloatingHud() {
  const { bottomDockOpen, present, mode } = useWorkspace();
  const bottomOffset =
    present || mode !== 'visualize' ? 12 : bottomDockOpen ? CSS_CHROME_BOTTOM_DOCK : CSS_CHROME_BOTTOM_RAIL;

  return <GlobalTransportBar bottomOffset={present ? 12 : bottomOffset} />;
}
