/** Kind of a searchable hit — drives section grouping and navigation. */
export type SearchHitKind =
  | 'problem'
  | 'category'
  | 'glossary'
  | 'game'
  | 'action'
  | 'panel'
  | 'effect'
  | 'plan'
  | 'resume'
  | 'interview'
  | 'canvas';

export interface SearchFacets {
  difficulty?: string;
  track?: string;
  tag?: string;
  categoryId?: string;
}

/** Indexed document used by the client scorer (no run/href — those are attached later). */
export interface SearchDocument {
  kind: SearchHitKind;
  id: string;
  title: string;
  subtitle?: string;
  /** Extra searchable text (summary, tags, keywords). */
  keywords?: string[];
  facets?: SearchFacets;
}

export interface SearchHit extends SearchDocument {
  score: number;
  /** Optional navigation target for hub pages. */
  href?: string;
  /** Optional action when selected (workspace commands). */
  run?: () => void;
}

export interface SearchSection {
  id: string;
  label: string;
  hits: SearchHit[];
}

export interface ClientSearchOptions {
  /** Cap total hits returned (default 40). */
  limit?: number;
  /** Restrict to these kinds. */
  kinds?: SearchHitKind[];
  /** Facet filters — all provided facets must match. */
  facets?: SearchFacets;
  /** Recent hit ids get a score boost when ranking. */
  recentIds?: string[];
  /** Extra documents (actions, panels) merged into the static index for this query. */
  extra?: SearchDocument[];
}

/** Server hit shape from GET /api/search. */
export interface ServerSearchHit {
  kind: 'plan' | 'resume' | 'interview' | 'canvas' | 'game';
  id: string;
  title: string;
  subtitle?: string;
  score: number;
}
