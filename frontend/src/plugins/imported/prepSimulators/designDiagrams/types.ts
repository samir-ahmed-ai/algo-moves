/**
 * Static "design flow" diagram spec. Design-topic prep problems render one of
 * these instead of an animated frame timeline: labelled boxes (components / data
 * structures) placed on a simple column/row grid, connected by arrows. Rendered
 * by `DesignFlow` as inline, theme-aware SVG (no external image files).
 */

/** Visual role of a box — drives fill/stroke styling in `DesignFlow`. */
export type DiagramNodeKind =
  | 'store' // a data structure the design keeps (map, array, heap, tree)
  | 'op' // an operation / public API method
  | 'io' // external input/output (client, request, stream)
  | 'note'; // an annotation / invariant callout

export interface DiagramNode {
  id: string;
  /** Grid column (0-based, left→right). Fractions allowed for fine placement. */
  col: number;
  /** Grid row (0-based, top→bottom). Fractions allowed. */
  row: number;
  /** Bold title drawn in the box. */
  label: string;
  /** Optional secondary lines (fields, complexity, sample values). */
  lines?: string[];
  /** Column span (default 1) for wider boxes. */
  w?: number;
  kind?: DiagramNodeKind;
}

export interface DiagramEdge {
  from: string;
  to: string;
  /** Optional label drawn at the edge midpoint. */
  label?: string;
  /** Dashed line (e.g. optional / lazy relationship). */
  dashed?: boolean;
  /** Draw arrowheads on both ends. */
  bidir?: boolean;
}

export interface DesignDiagramSpec {
  /** Short title shown above the diagram. */
  title?: string;
  /** One-line caption under the title explaining the design at a glance. */
  caption?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  /** Optional legend chips shown beneath the diagram. */
  legend?: string[];
}
