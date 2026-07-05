/** Shared WebSocket room transport for games arcade and canvas collaboration. */
export {
  GameRoomProvider,
  useGameRoom,
  useGameRoomOptional,
  useRoom,
  type ConnectOptions,
  type GameRoomApi,
  type RoomApi,
  type RoomStatus,
} from './useRoom';
export { usePublishState } from './usePublishState';
export {
  fetchNewRoomCode,
  gameServerHttpBase,
  gameServerWsUrl,
  hasConfiguredServer,
  makePlayerId,
  makeRoomCode,
  normalizeRoomCode,
} from './server';
export {
  isPlayerRole,
  parseServerMessage,
  type Peer,
  type Role,
  type ServerMessage,
} from './protocol';
export {
  ROOM_STATE_V,
  buildCanvasRoomState,
  extractCanvasDoc,
  extractSessionMeta,
  isRoomEnvelope,
  type RoomSharedEnvelope,
} from './roomState';
