export type {
  SearchHitKind,
  SearchFacets,
  SearchDocument,
  SearchHit,
  SearchSection,
  ClientSearchOptions,
  ServerSearchHit,
} from './types';

export {
  compactSearchText,
  parseSearchTerms,
  scoreDocument,
  documentMatchesFacets,
  matchesSearchFields,
} from './score';

export {
  itemToSearchDocument,
  categoryToSearchDocument,
  resetClientSearchIndex,
  getClientSearchIndex,
  searchClient,
  searchBrowseRanked,
} from './clientIndex';

export { serverHitToSearchHit, mergeSearchSections, flattenSearchSections } from './merge';
