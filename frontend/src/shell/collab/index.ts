/** Canvas collaboration transport — relay/Yjs orchestration, protocol, sync hooks. */
export {
  CanvasCollabProvider,
  useCanvasCollab,
  useCanvasCollabOptional,
  type CanvasCollabApi,
  type PeerPresence,
} from './CanvasCollabProvider';
export { NodePresenceAvatars } from './NodePresenceAvatars';
export { CanvasCollabOverlays } from './CanvasCollabOverlays';
export { CommentLayer } from './CommentLayer';
export { SoloFallbackBanner } from './SoloFallbackBanner';
export { COLLAB_WIDGETS, SessionBody } from './collabWidgets';
export { SAVED_CANVASES_WIDGET } from './SavedCanvasesWidget';
export { SubDocSyncProvider, useSubDocSyncContext } from './sync/SubDocSyncProvider';
export { useSubDocSync } from './sync/useSubDocSync';
export { useCanvasDocSync } from './sync/useCanvasDocSync';
export { useCanvasFollow } from './sync/useCanvasFollow';
export { useCanvasFrameFollow } from './sync/useCanvasFrameFollow';
export { useQuizHostRelay } from './sync/useQuizHostRelay';
export type { CanvasDoc } from './protocol/collabProtocol';
export { isCanvasDoc } from './protocol/canvasDoc';
export { canMoveCanvasNodes, canEditSubDoc } from './protocol/subdocPermissions';
export {
  SUBDOC_TAG,
  type SubDocSnapshot,
  type WhiteboardPayload,
  type EditorPayload,
} from './protocol/subdocProtocol';
