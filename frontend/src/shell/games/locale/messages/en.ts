import type { ArcadeStrings } from './types';

export const en: ArcadeStrings = {
  header: {
    games: 'Games',
    backToGames: 'Games',
    home: 'Home',
    leaveRoom: 'Leave room',
    reconnecting: 'Reconnecting…',
    lightTheme: 'Light theme',
    darkTheme: 'Dark theme',
  },
  language: {
    label: 'Language',
    arabic: 'العربية',
    english: 'English',
    hostOnly: 'Only the host can change the language in this room',
  },
  lobby: {
    title: 'Two-player games',
    subtitle: 'Create a room and share the code — play together from anywhere.',
    yourName: 'Your name',
    namePlaceholder: 'e.g. Ahmed',
    createTab: 'Create',
    joinTab: 'Join',
    createRoom: 'Create a room',
    creatingRoom: 'Creating room…',
    joinRoom: 'Join room',
    joining: 'Joining…',
    cancel: 'Cancel',
    roomCodePlaceholder: 'ROOM CODE',
    createRoomError: 'Could not create a room.',
    lanHint:
      'LAN mode: run make backend-dev and open this site on your machine\'s IP. For internet play, set VITE_GAMES_SERVER_URL at build time.',
  },
  waitingRoom: {
    waitingTitle: 'Waiting for your partner…',
    waitingDetail: 'Share this code — the game starts the moment they join.',
    partnerLeftTitle: 'Your partner left the room',
    partnerLeftDetail: 'Share the code again — the game resumes when they rejoin.',
    serverHintDeployed: 'Both devices need internet access to reach the deployed game server.',
    serverHintLan:
      "Both devices need to reach the game server. On the same Wi-Fi, open this site on the host's IP and run make backend-dev.",
  },
  partnerLeftBanner: {
    title: 'Your partner left.',
    detailHost: 'The game stays on screen while you wait. Share the room code again, or tap Games above to pick another.',
    detailGuest:
      'The game stays on screen while you wait. Share the room code again, or ask the host to pick another game.',
  },
  picker: {
    playersIn: (self, peer) => `${self} & ${peer} are in`,
    title: 'Pick a game',
    hostHint: 'Choose a game — it opens on both screens.',
    guestHint: 'Waiting for the host to pick a game…',
    paceTogether: 'Together',
    paceTurns: 'Turns',
    you: 'You',
    partner: 'Partner',
    vs: 'vs',
  },
  shareRoom: {
    roomCode: 'Room code',
    copyLink: 'Copy invite link',
    linkCopied: 'Link copied',
    qrTitle: (room) => `Join room ${room}`,
  },
  waitingReconnect: (name) => `Waiting for ${name} to reconnect…`,
};
