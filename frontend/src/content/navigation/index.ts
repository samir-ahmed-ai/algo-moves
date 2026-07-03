/**
 * Catalog ↔ browse taxonomy bridge — single source for desktop and mobile navigation.
 */
export {
  getItemsForCategory as resolveCategoryItems,
  topicForCategory as syntheticTopicForCategory,
  categoryIdForTopic,
  browseBreadcrumbForItem,
  getItemsForCategory,
  topicForCategory,
  getAllCategories,
  getCategoriesForTrack,
  getCategoryById,
  getTrackById,
  getTracks,
  browseTopicId,
  categoryIdFromBrowseTopic,
  isBrowseTopicId,
  type BrowseCategory,
  type BrowseTrack,
  type TrackId,
} from '../browse';
