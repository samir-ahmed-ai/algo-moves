export type ArcadeStrings = {
  header: {
    games: string;
    backToGames: string;
    home: string;
    leaveRoom: string;
    reconnecting: string;
    lightTheme: string;
    darkTheme: string;
  };
  language: {
    switchToEnglish: string;
    switchToArabic: string;
    hostOnly: string;
  };
  lobby: {
    title: string;
    subtitle: string;
    yourName: string;
    namePlaceholder: string;
    createTab: string;
    joinTab: string;
    createRoom: string;
    creatingRoom: string;
    joinRoom: string;
    joining: string;
    cancel: string;
    roomCodePlaceholder: string;
    createRoomError: string;
    lanHint: string;
  };
  waitingRoom: {
    waitingTitle: string;
    waitingDetail: string;
    partnerLeftTitle: string;
    partnerLeftDetail: string;
    serverHintDeployed: string;
    serverHintLan: string;
  };
  partnerLeftBanner: {
    title: string;
    detailHost: string;
    detailGuest: string;
  };
  picker: {
    playersIn: (self: string, peer: string) => string;
    title: string;
    hostHint: string;
    guestHint: string;
    paceTogether: string;
    paceTurns: string;
    you: string;
    partner: string;
    vs: string;
  };
  shareRoom: {
    roomCode: string;
    copyLink: string;
    linkCopied: string;
    qrTitle: (room: string) => string;
  };
  waitingReconnect: (name: string) => string;
};
