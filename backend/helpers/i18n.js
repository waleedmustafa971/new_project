// helpers/i18n.js

/*
  Multi-language support: Arabic and English.

  Two different jobs live here, and only one of them is usually thought of as
  "translation".

  The first is the app's own interface strings, which the client could ship in
  its bundle. They are served from here anyway so a wording fix does not need an
  app-store release, and so both platforms cannot drift apart on the same label.

  The second is the job the client genuinely cannot do: text the *server*
  composes and sends out on its own — the body of a push notification. That text
  is written while the recipient is not looking at the app, so nothing on the
  device can translate it afterwards. It has to be composed in the recipient's
  language at the moment it is sent, which is why `notify()` reads their
  preference and calls in here rather than formatting English inline.

  Arabic is right-to-left. The server does not lay anything out, so the only
  thing it owes the client is an honest `rtl` flag next to the language, rather
  than a hardcoded list of "which languages are backwards" on each platform.
*/

export const DEFAULT_LANGUAGE = "en";

export const LANGUAGES = [
  { code: "en", name: "English",  nativeName: "English", rtl: false },
  { code: "ar", name: "Arabic",   nativeName: "العربية", rtl: true },
];

const BY_CODE = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));

export const isLanguage = (code) => Object.hasOwn(BY_CODE, String(code || ""));
export const languageInfo = (code) => BY_CODE[String(code || "")] || BY_CODE[DEFAULT_LANGUAGE];

/*
  Normalise whatever the client sends.

  A device reports its locale as "ar-AE", "ar_SA" or "en-GB", never as the bare
  code stored here. Taking the part before the separator means a phone set to
  any Arabic region gets Arabic instead of silently falling back to English.
*/
export const normaliseLanguage = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  const base = raw.split(/[-_]/)[0];
  return isLanguage(base) ? base : null;
};

/* ------------------------------------------------------------------ */
/* the string catalogue                                                */
/* ------------------------------------------------------------------ */

/*
  Placeholders are `{name}`. They are filled by `t()` rather than by template
  literals because Arabic puts them in a different order than English does —
  a sentence assembled by concatenation can only ever come out in English word
  order, which is the usual way "translated" apps still read as English.
*/
const STRINGS = {
  en: {
    /* notification bodies — composed server-side, see the note above */
    "notif.like":            "{actor} liked your post",
    "notif.love":            "{actor} loved your post",
    "notif.haha":            "{actor} laughed at your post",
    "notif.wow":             "{actor} was amazed by your post",
    "notif.sad":             "{actor} was saddened by your post",
    "notif.angry":           "{actor} was angered by your post",
    "notif.comment":         "{actor} commented: {preview}",
    "notif.reply":           "{actor} replied: {preview}",
    "notif.comment_like":    "{actor} hearted your comment",
    "notif.mention_post":    "{actor} mentioned you in a post",
    "notif.mention_comment": "{actor} mentioned you in a comment",
    "notif.mention_story":   "{actor} mentioned you in their story",
    "notif.tag":             "{actor} tagged you in a photo",
    "notif.follow":          "{actor} started following you",
    "notif.share":           "{actor} shared your post",
    "notif.story_view":      "{actor} watched your story",
    "notif.story_response":  "{actor} answered: {preview}",
    "notif.message":         "{actor} sent you a message",
    "notif.page_post":       "{actor} posted something new",
    "notif.live_request":    "{actor} wants to join your live",
    "notif.live_invite":     "{actor} invited you onto their live",
    "notif.live_gift":       "{actor} sent you a gift",
    "notif.post_gift":       "{actor} sent a gift on your reel",
    "notif.subscription":    "{actor} subscribed to you",
    "notif.default":         "You have a new notification",

    "notif.title.login_alert":   "New sign-in",
    "notif.login_alert":         "Your account was signed in to from {preview}",
    "notif.title.subscription":  "New subscriber",
    "notif.title.group_request": "New join request",
    "notif.group_request":       "{actor} asked to join {preview}",
    "notif.title.group_approved": "Request approved",
    "notif.group_approved":      "You're now a member of {preview}",
    "notif.title.group_invite":  "Group invitation",
    "notif.group_invite":        "{actor} invited you to {preview}",
    "notif.title.group_role":    "New group role",
    "notif.group_role":          "{actor} changed your role in a group",
    "notif.group_post":          "There's an update on your group post",

    "notif.fallback.new_device": "a new device",
    "notif.fallback.group":      "your group",
    "notif.fallback.the_group":  "the group",
    "notif.fallback.a_group":    "a group",
    "notif.fallback.sticker":    "your story sticker",

    /* interface strings the app renders itself */
    "app.settings":          "Settings",
    "app.appearance":        "Appearance",
    "app.theme.light":       "Light",
    "app.theme.dark":        "Dark",
    "app.theme.system":      "Match device",
    "app.language":          "Language",
    "app.notifications":     "Notifications",
    "app.quietHours":        "Quiet hours",
    "app.muted":             "Muted accounts",
    "app.feed":              "Feed",
    "app.explore":           "Explore",
    "app.messages":          "Messages",
    "app.profile":           "Profile",
    "app.follow":            "Follow",
    "app.following":         "Following",
    "app.followers":         "Followers",
    "app.like":              "Like",
    "app.comment":           "Comment",
    "app.share":             "Share",
    "app.save":              "Save",
    "app.delete":            "Delete",
    "app.cancel":            "Cancel",
    "app.retry":             "Try again",
    "app.editor.trim":       "Trim",
    "app.editor.filters":    "Filters",
    "app.editor.text":       "Text",
    "app.editor.music":      "Music",
    "app.error.generic":     "Something went wrong",
    "app.error.offline":     "You're offline",
  },

  ar: {
    "notif.like":            "أعجب {actor} بمنشورك",
    "notif.love":            "أحب {actor} منشورك",
    "notif.haha":            "ضحك {actor} على منشورك",
    "notif.wow":             "أُعجب {actor} كثيرًا بمنشورك",
    "notif.sad":             "أحزن منشورك {actor}",
    "notif.angry":           "أغضب منشورك {actor}",
    "notif.comment":         "علّق {actor}: {preview}",
    "notif.reply":           "ردّ {actor}: {preview}",
    "notif.comment_like":    "أعجب {actor} بتعليقك",
    "notif.mention_post":    "أشار إليك {actor} في منشور",
    "notif.mention_comment": "أشار إليك {actor} في تعليق",
    "notif.mention_story":   "أشار إليك {actor} في قصته",
    "notif.tag":             "أشار إليك {actor} في صورة",
    "notif.follow":          "بدأ {actor} بمتابعتك",
    "notif.share":           "شارك {actor} منشورك",
    "notif.story_view":      "شاهد {actor} قصتك",
    "notif.story_response":  "أجاب {actor}: {preview}",
    "notif.message":         "أرسل إليك {actor} رسالة",
    "notif.page_post":       "نشر {actor} شيئًا جديدًا",
    "notif.live_request":    "يريد {actor} الانضمام إلى بثك",
    "notif.live_invite":     "دعاك {actor} للانضمام إلى بثه",
    "notif.live_gift":       "أرسل إليك {actor} هدية",
    "notif.post_gift":       "أرسل {actor} هدية على مقطعك",
    "notif.subscription":    "اشترك {actor} معك",
    "notif.default":         "لديك إشعار جديد",

    "notif.title.login_alert":   "تسجيل دخول جديد",
    "notif.login_alert":         "تم تسجيل الدخول إلى حسابك من {preview}",
    "notif.title.subscription":  "مشترك جديد",
    "notif.title.group_request": "طلب انضمام جديد",
    "notif.group_request":       "طلب {actor} الانضمام إلى {preview}",
    "notif.title.group_approved": "تمت الموافقة على الطلب",
    "notif.group_approved":      "أنت الآن عضو في {preview}",
    "notif.title.group_invite":  "دعوة إلى مجموعة",
    "notif.group_invite":        "دعاك {actor} إلى {preview}",
    "notif.title.group_role":    "دور جديد في المجموعة",
    "notif.group_role":          "غيّر {actor} دورك في المجموعة",
    "notif.group_post":         "هناك تحديث على منشورك في المجموعة",

    "notif.fallback.new_device": "جهاز جديد",
    "notif.fallback.group":      "مجموعتك",
    "notif.fallback.the_group":  "المجموعة",
    "notif.fallback.a_group":    "مجموعة",
    "notif.fallback.sticker":    "ملصق قصتك",

    "app.settings":          "الإعدادات",
    "app.appearance":        "المظهر",
    "app.theme.light":       "فاتح",
    "app.theme.dark":        "داكن",
    "app.theme.system":      "حسب الجهاز",
    "app.language":          "اللغة",
    "app.notifications":     "الإشعارات",
    "app.quietHours":        "ساعات الهدوء",
    "app.muted":             "الحسابات المكتومة",
    "app.feed":              "الرئيسية",
    "app.explore":           "استكشاف",
    "app.messages":          "الرسائل",
    "app.profile":           "الملف الشخصي",
    "app.follow":            "متابعة",
    "app.following":         "أتابع",
    "app.followers":         "المتابعون",
    "app.like":              "إعجاب",
    "app.comment":           "تعليق",
    "app.share":             "مشاركة",
    "app.save":              "حفظ",
    "app.delete":            "حذف",
    "app.cancel":            "إلغاء",
    "app.retry":             "إعادة المحاولة",
    "app.editor.trim":       "قص",
    "app.editor.filters":    "الفلاتر",
    "app.editor.text":       "نص",
    "app.editor.music":      "الموسيقى",
    "app.error.generic":     "حدث خطأ ما",
    "app.error.offline":     "أنت غير متصل",
  },
};

/*
  Look a string up and fill its placeholders.

  A missing Arabic key falls back to the English one rather than to the key
  name: an untranslated string should read as an English sentence to the person
  who receives it, not as `notif.group_role`. `t()` returning the key itself is
  how placeholder text reaches production.
*/
export const t = (key, lang = DEFAULT_LANGUAGE, vars = {}) => {
  const code = isLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  const template = STRINGS[code]?.[key] ?? STRINGS[DEFAULT_LANGUAGE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    vars[name] === undefined || vars[name] === null ? whole : String(vars[name])
  );
};

/* The whole catalogue for one language, for the app to cache on launch. */
export const stringsFor = (lang = DEFAULT_LANGUAGE) => {
  const code = isLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  // English underneath so a key translated in neither place still comes back.
  return { ...STRINGS[DEFAULT_LANGUAGE], ...STRINGS[code] };
};

/* Which keys have no translation yet — the honest version of "100% localised". */
export const missingKeys = (lang) => {
  const code = isLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  return Object.keys(STRINGS[DEFAULT_LANGUAGE]).filter((k) => STRINGS[code]?.[k] === undefined);
};

export const keyCount = () => Object.keys(STRINGS[DEFAULT_LANGUAGE]).length;
