/* ================================================================
   App settings — appearance and language.
   (Advanced / Optional Features: Dark Mode, Multi-Language Support)

   Two rows off the sheet that look like client-side concerns and are not
   quite. The theme genuinely is one — the server renders nothing — but it is
   stored here so it survives a reinstall and follows the account onto a second
   device, which device-local storage cannot do.

   The language is not a client-side concern at all. Push notification bodies
   are composed on the server while the app is closed, so this preference is the
   only thing that decides what language they arrive in. See helpers/i18n.js.
   ================================================================ */

import mongoose from "mongoose";
import User from "../models/users.js";
import {
  LANGUAGES, DEFAULT_LANGUAGE, isLanguage, normaliseLanguage,
  languageInfo, stringsFor, missingKeys, keyCount, t,
} from "../helpers/i18n.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const who = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[settings]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const THEMES = ["light", "dark", "system"];

/*
  Shape the stored value into what a settings screen needs.

  `rtl` travels with the language rather than being inferred on the device: two
  platforms each keeping their own list of right-to-left languages is two lists
  that will disagree the first time a third language is added.
*/
const shapeAppearance = (user) => {
  const theme = THEMES.includes(user?.appearance?.theme) ? user.appearance.theme : "system";
  const language = normaliseLanguage(user?.appearance?.language) || DEFAULT_LANGUAGE;
  const info = languageInfo(language);
  return {
    theme,
    language,
    languageName: info.name,
    languageNativeName: info.nativeName,
    rtl: info.rtl,
  };
};

/* ------------------------------------------------------------------ */
/* the settings themselves                                             */
/* ------------------------------------------------------------------ */

export const getSettings = wrap(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(userId).select("appearance").lean();
  if (!user) return fail(res, 404, "User not found");

  ok(res, {
    appearance: shapeAppearance(user),
    themes: THEMES,
    languages: LANGUAGES,
  });
});

export const updateSettings = wrap(async (req, res) => {
  const userId = who(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const set = {};

  if (req.body?.theme !== undefined) {
    const theme = String(req.body.theme).toLowerCase();
    if (!THEMES.includes(theme)) {
      return fail(res, 400, `theme must be one of: ${THEMES.join(", ")}`);
    }
    set["appearance.theme"] = theme;
  }

  if (req.body?.language !== undefined) {
    /*
      Accept the locale a device actually reports. Phones send "ar-AE" or
      "en_GB", never the bare code stored here, and rejecting those means every
      client has to trim the region itself — which one of them will forget.
    */
    const language = normaliseLanguage(req.body.language);
    if (!language) {
      return fail(res, 400, `language must be one of: ${LANGUAGES.map((l) => l.code).join(", ")}`);
    }
    set["appearance.language"] = language;
  }

  if (Object.keys(set).length === 0) return fail(res, 400, "Supply a theme or a language");

  const user = await User.findByIdAndUpdate(userId, { $set: set }, { new: true })
    .select("appearance").lean();
  if (!user) return fail(res, 404, "User not found");

  const appearance = shapeAppearance(user);
  ok(res, {
    // Answered in the language just chosen, which is the smallest possible
    // proof to the client that the change took.
    message: t("app.settings", appearance.language),
    appearance,
  });
});

/* ------------------------------------------------------------------ */
/* the translation catalogue                                           */
/* ------------------------------------------------------------------ */

/*
  Every language the server can speak.

  Served rather than hardcoded in the app so adding a third one is a server
  deploy instead of two app-store releases.
*/
export const listLanguages = wrap(async (req, res) => {
  ok(res, {
    languages: LANGUAGES.map((l) => ({
      ...l,
      // How complete each one is, stated rather than implied. A language that
      // is 80% translated should be visible as such, not silently half-English.
      translatedKeys: keyCount() - missingKeys(l.code).length,
      totalKeys: keyCount(),
    })),
    default: DEFAULT_LANGUAGE,
  });
});

/*
  The interface strings for one language, for the app to cache at launch.

  Shipped from the server so a wording fix does not need an app-store release,
  and so the two platforms cannot drift apart on the same label.
*/
export const getStrings = wrap(async (req, res) => {
  const requested = req.query.lang ?? req.query.language;
  const lang = normaliseLanguage(requested) || DEFAULT_LANGUAGE;

  // Say when a language was asked for and not understood, rather than quietly
  // serving English and letting the client believe it got Arabic.
  const recognised = requested === undefined || normaliseLanguage(requested) !== null;
  if (!recognised) return fail(res, 400, `Unknown language: ${requested}`);

  const info = languageInfo(lang);
  const strings = stringsFor(lang);
  const missing = missingKeys(lang);

  ok(res, {
    language: lang,
    name: info.name,
    nativeName: info.nativeName,
    rtl: info.rtl,
    count: Object.keys(strings).length,
    // Keys with no translation come back in English; naming them is the honest
    // version of "fully localised".
    untranslated: missing,
    strings,
  });
});

export default {
  getSettings, updateSettings, listLanguages, getStrings,
};
