import type { ArcadeStrings } from './types';

export const ar: ArcadeStrings = {
  header: {
    games: 'الألعاب',
    backToGames: 'الألعاب',
    home: 'الرئيسية',
    leaveRoom: 'مغادرة الغرفة',
    reconnecting: 'جارٍ إعادة الاتصال…',
    lightTheme: 'الوضع الفاتح',
    darkTheme: 'الوضع الداكن',
  },
  language: {
    label: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    hostOnly: 'يمكن للمضيف فقط تغيير اللغة في هذه الغرفة',
  },
  lobby: {
    title: 'ألعاب لشخصين',
    subtitle: 'أنشئ غرفة وشارك الرمز — العبوا معاً من أي مكان.',
    yourName: 'اسمك',
    namePlaceholder: 'مثال: أحمد',
    createTab: 'إنشاء',
    joinTab: 'انضمام',
    createRoom: 'إنشاء غرفة',
    creatingRoom: 'جارٍ إنشاء الغرفة…',
    joinRoom: 'انضم إلى الغرفة',
    joining: 'جارٍ الانضمام…',
    cancel: 'إلغاء',
    roomCodePlaceholder: 'رمز الغرفة',
    createRoomError: 'تعذّر إنشاء الغرفة.',
    lanHint:
      'وضع الشبكة المحلية: شغّل make backend-dev وافتح الموقع على عنوان IP جهازك. للعب عبر الإنترنت، عيّن VITE_GAMES_SERVER_URL عند البناء.',
  },
  waitingRoom: {
    waitingTitle: 'بانتظار شريكك…',
    waitingDetail: 'شارك هذا الرمز — تبدأ اللعبة فور انضمامه.',
    partnerLeftTitle: 'غادر شريكك الغرفة',
    partnerLeftDetail: 'شارك الرمز مجدداً — تستأنف اللعبة عند عودته.',
    serverHintDeployed: 'يحتاج الجهازان إلى اتصال بالإنترنت للوصول إلى خادم الألعاب.',
    serverHintLan:
      'يحتاج الجهازان إلى الوصول لخادم الألعاب. على نفس شبكة Wi-Fi، افتح الموقع على عنوان IP المضيف وشغّل make backend-dev.',
  },
  partnerLeftBanner: {
    title: 'غادر شريكك.',
    detailHost: 'تبقى اللعبة على الشاشة أثناء الانتظار. شارك رمز الغرفة مجدداً، أو اضغط «الألعاب» أعلاه لاختيار لعبة أخرى.',
    detailGuest:
      'تبقى اللعبة على الشاشة أثناء الانتظار. شارك رمز الغرفة مجدداً، أو اطلب من المضيف اختيار لعبة أخرى.',
  },
  picker: {
    playersIn: (self, peer) => `${self} و${peer} متصلان`,
    title: 'اختر لعبة',
    hostHint: 'اختر لعبة — تُفتح على الشاشتين.',
    guestHint: 'بانتظار المضيف لاختيار لعبة…',
    paceTogether: 'معاً',
    paceTurns: 'أدوار',
    you: 'أنت',
    partner: 'الشريك',
    vs: 'ضد',
  },
  shareRoom: {
    roomCode: 'رمز الغرفة',
    copyLink: 'نسخ رابط الدعوة',
    linkCopied: 'تم نسخ الرابط',
    qrTitle: (room) => `انضم إلى الغرفة ${room}`,
  },
  waitingReconnect: (name) => `بانتظار ${name} لإعادة الاتصال…`,
};
