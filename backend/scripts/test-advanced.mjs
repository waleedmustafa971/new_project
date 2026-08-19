/*
  End-to-end HTTP suite for the Advanced / Optional Features section — the last
  section in the sheet.

  Five rows:
    Dark Mode                        /apis/settings
    Multi-Language (Arabic/English)  /apis/settings, and the push copy itself
    Video Editing Suite              /apis/editor  (filters half verified, not rebuilt)
    Music Library Integration        /apis/posting/music
    Cloud Storage Integration (AWS)  /apis/storage

  Two things this suite deliberately does *not* claim to prove, because they
  cannot be proven here and pretending otherwise is worse than the gap:

    * No push is ever delivered — there are no Firebase credentials. The
      notification *copy* is asserted by calling the composer directly, which is
      the part language actually changes.
    * No byte ever reaches S3 — no bucket is configured. The suite asserts the
      fallback is reported honestly, which is the behaviour that exists today.

  Run from the backend directory, with the server already up:
    node scripts/test-advanced.mjs
*/

const HOST = process.env.HOST || "http://localhost:5000";

/* Demo fixtures:
     LAYLA  creator account, owns the post being edited
     OMAR   personal account, the non-owner every ownership check needs
*/
const U = {
  layla: "6a830332316418fdbc512051",
  omar:  "6a830332316418fdbc512052",
};

let pass = 0, failed = 0;
const failures = [];

const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else {
    failed++; failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
};

const request = (root) => async (method, path, { as, body, query } = {}) => {
  const url = new URL(root + path);
  if (as) url.searchParams.set("userId", as);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const hasBody = !["GET", "HEAD"].includes(method) && (body !== undefined || as);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: hasBody ? JSON.stringify({ userId: as, ...(body || {}) }) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  return { ...json, _http: res.status };
};

const settings = request(`${HOST}/apis/settings`);
const editor   = request(`${HOST}/apis/editor`);
const storage  = request(`${HOST}/apis/storage`);
const posting  = request(`${HOST}/apis/posting`);
const feed     = request(`${HOST}/apis/feed`);

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

/* Run from backend/, so resolve the project's own dependencies. */
const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const OID = (v) => new mongoose.Types.ObjectId(String(v));

/*
  The push composer, imported directly.

  A notification body is the one sentence the server writes for a person to
  read, and it is written while the app is closed — so this is where language
  either works or does not. With no Firebase credentials nothing is ever
  delivered, and asserting on the composed string is the only honest way to
  check the words rather than the transport.
*/
const { copyFor } = await import("../services/notificationService.js");
const { t, stringsFor, missingKeys, normaliseLanguage, LANGUAGES } = await import("../helpers/i18n.js");
const { storageStatus, publicUrl, buildKey, kindOf } = await import("../helpers/storage.js");

const FIXTURES = Object.values(U);

/* ---- snapshot ---- */
const before = {};
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne({ _id: OID(id) },
    { projection: { appearance: 1, savedMusic: 1 } });
  before[id] = {
    appearance: u?.appearance ?? null,
    savedMusic: u?.savedMusic || [],
  };
}

const baseline = {
  reels: await db.collection("reels").countDocuments({}),
  musictbls: await db.collection("musictbls").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
};

const created = { posts: [] };
let restored = false;

/*
  Restore even if this run falls over. An account left in Arabic or in dark mode
  is quiet drift, and the next run would snapshot it as its own baseline.
*/
const restoreAll = async () => {
  if (restored) return;
  restored = true;

  for (const id of FIXTURES) {
    const b = before[id];
    const update = { $set: { savedMusic: b.savedMusic } };
    if (b.appearance === null) update.$unset = { appearance: "" };
    else update.$set.appearance = b.appearance;
    await db.collection("users").updateOne({ _id: OID(id) }, update);
  }

  if (created.posts.length) {
    await db.collection("reels").deleteMany({ _id: { $in: created.posts.filter(Boolean).map(OID) } });
  }
};

for (const event of ["uncaughtException", "unhandledRejection"]) {
  process.on(event, async (err) => {
    console.error(`\n  !! ${event} — restoring settings state before exiting\n`, err);
    try { await restoreAll(); } catch { /* nothing more we can do */ }
    process.exit(1);
  });
}

/* Sweep leftovers from an interrupted run. */
const SUITE_TAG = "SUITE advanced";
const stale = await db.collection("reels").find({ videoTitle: new RegExp(`^${SUITE_TAG}`) }).toArray();
if (stale.length) {
  await db.collection("reels").deleteMany({ _id: { $in: stale.map((r) => r._id) } });
  console.log(`  swept ${stale.length} leftover post(s) from an interrupted run`);
}

/* ================================================================== */
section("1. Dark Mode");

const s0 = await settings("GET", "/", { as: U.layla });
check("settings read back", s0.success === true);
check("a theme is always present", ["light", "dark", "system"].includes(s0.appearance?.theme));
check("and the choices are offered rather than assumed",
  Array.isArray(s0.themes) && s0.themes.length === 3);

const dark = await settings("PUT", "/", { as: U.layla, body: { theme: "dark" } });
check("the theme can be set to dark", dark.appearance?.theme === "dark");

const persisted = await settings("GET", "/", { as: U.layla });
check("and it survives the round trip", persisted.appearance?.theme === "dark");

const raw = await db.collection("users").findOne({ _id: OID(U.layla) }, { projection: { appearance: 1 } });
check("stored on the account, not in a device's own storage", raw?.appearance?.theme === "dark");

const light = await settings("PUT", "/", { as: U.layla, body: { theme: "light" } });
check("and back to light", light.appearance?.theme === "light");

const sys = await settings("PUT", "/", { as: U.layla, body: { theme: "system" } });
check("\"system\" is a real third option, not a missing value", sys.appearance?.theme === "system");

const badTheme = await settings("PUT", "/", { as: U.layla, body: { theme: "midnight" } });
check("an unknown theme is refused", badTheme._http === 400);

const nothing = await settings("PUT", "/", { as: U.layla, body: {} });
check("a write with nothing in it is refused rather than reported as saved", nothing._http === 400);

const noUser = await settings("GET", "/", { as: "not-an-id" });
check("a bad userId is refused", noUser._http === 400);

/* ================================================================== */
section("2. Multi-Language Support (Arabic / English)");

const langs = await settings("GET", "/languages");
check("the languages are served, not hardcoded in the app", (langs.languages || []).length === 2);
const ar = (langs.languages || []).find((l) => l.code === "ar");
const en = (langs.languages || []).find((l) => l.code === "en");
check("Arabic is offered", !!ar);
check("with its own name in its own script", ar?.nativeName === "العربية");
check("and marked right-to-left, so no client has to keep that list",
  ar?.rtl === true && en?.rtl === false);
check("translation completeness is stated rather than implied",
  typeof ar?.translatedKeys === "number" && ar.translatedKeys === ar.totalKeys);

const strEn = await settings("GET", "/strings", { query: { lang: "en" } });
const strAr = await settings("GET", "/strings", { query: { lang: "ar" } });
check("the English catalogue is served", (strEn.count || 0) > 30);
check("and the Arabic one is the same size", strAr.count === strEn.count);
check("Arabic strings are actually Arabic", strAr.strings?.["app.settings"] === "الإعدادات");
check("and nothing is left untranslated", (strAr.untranslated || []).length === 0);
check("the catalogue carries the direction with it", strAr.rtl === true);

const strRegion = await settings("GET", "/strings", { query: { lang: "ar-AE" } });
check("a device locale like ar-AE resolves to Arabic", strRegion.language === "ar");
const strBad = await settings("GET", "/strings", { query: { lang: "fr" } });
check("a language the server does not speak is refused, not silently English",
  strBad._http === 400);

const setAr = await settings("PUT", "/", { as: U.layla, body: { language: "ar" } });
check("a person can choose Arabic", setAr.appearance?.language === "ar");
check("and the reply comes back in it", setAr.message === "الإعدادات");
check("with the RTL flag alongside", setAr.appearance?.rtl === true);

const setRegion = await settings("PUT", "/", { as: U.layla, body: { language: "en_GB" } });
check("an underscore locale is understood too", setRegion.appearance?.language === "en");

const badLang = await settings("PUT", "/", { as: U.layla, body: { language: "klingon" } });
check("an unknown language is refused", badLang._http === 400);

/* the part that only the server can do */
const enLike = copyFor("like", "Omar", { reactionType: "like" }, "en");
const arLike = copyFor("like", "Omar", { reactionType: "like" }, "ar");
check("push copy is composed in English by default", enLike.body === "Omar liked your post");
check("and in Arabic for an Arabic account", arLike.body === "أعجب Omar بمنشورك");
check("the name moves position between the two, so it is not English word order",
  enLike.body.indexOf("Omar") < arLike.body.indexOf("Omar"));

check("a reaction kind changes the verb in Arabic too",
  copyFor("like", "Omar", { reactionType: "love" }, "ar").body === "أحب Omar منشورك");
check("group copy translates, including its title",
  copyFor("group_request", "Omar", { preview: "Photography" }, "ar").title === "طلب انضمام جديد");
check("and keeps the caller's group name untranslated inside it",
  copyFor("group_request", "Omar", { preview: "Photography" }, "ar").body.includes("Photography"));
check("a message body is the message, not a translated quotation",
  copyFor("message", "Omar", { preview: "Are you coming?" }, "ar").body === "Are you coming?");
check("an unknown language falls back to English rather than to a key name",
  copyFor("follow", "Omar", {}, "zz").body === "Omar started following you");
check("a missing key falls back to English rather than surfacing the key",
  t("app.settings", "zz") === "Settings");

/* the wiring: notify() must read the recipient's stored language */
await db.collection("users").updateOne({ _id: OID(U.layla) }, { $set: { "appearance.language": "ar" } });
const stored = await db.collection("users").findOne({ _id: OID(U.layla) }, { projection: { appearance: 1 } });
check("the language notify() will read is on the account",
  normaliseLanguage(stored?.appearance?.language) === "ar");
await settings("PUT", "/", { as: U.layla, body: { language: "en" } });

/* ================================================================== */
section("3. Video Editing Suite — trim");

const made = await feed("POST", "/posts", {
  as: U.layla,
  body: {
    caption: `${SUITE_TAG} clip`,
    posttype: "Post",
    media: [{ url: "https://example.com/clip.mp4", type: "video", duration: 30 }],
  },
});
const POST = made.item?._id;
check("the suite's own video post was created", !!POST, JSON.stringify(made).slice(0, 140));
if (POST) created.posts.push(POST);

const edit0 = await editor("GET", `/posts/${POST}`, { as: U.layla });
check("a post with no edits reads back cleanly", edit0.edit?.trim === null);
check("and reports the source duration a trim is bounded by", edit0.edit?.sourceDuration === 30);
check("and says out loud that nothing was rendered", edit0.edit?.rendered === false);

const trim = await editor("PUT", `/posts/${POST}/trim`, { as: U.layla, body: { start: 4, end: 12.5 } });
check("a trim is saved", trim.edit?.trim?.start === 4 && trim.edit?.trim?.end === 12.5);
check("with its resulting length worked out", trim.edit?.trim?.duration === 8.5);
check("and a revision the editor can compare against", trim.edit?.revision === 1);

const mediaAfter = await db.collection("reels").findOne({ _id: OID(POST) }, { projection: { media: 1 } });
check("the media itself is untouched — decisions, not a render",
  mediaAfter?.media?.[0]?.duration === 30 && mediaAfter?.media?.[0]?.url === "https://example.com/clip.mp4");

const backwards = await editor("PUT", `/posts/${POST}/trim`, { as: U.layla, body: { start: 10, end: 5 } });
check("a trim that ends before it starts is refused", backwards._http === 422);

const past = await editor("PUT", `/posts/${POST}/trim`, { as: U.layla, body: { start: 0, end: 90 } });
check("a trim past the end of the clip is refused", past._http === 422);

const negative = await editor("PUT", `/posts/${POST}/trim`, { as: U.layla, body: { start: -3, end: 5 } });
check("a negative start is refused", negative._http === 422);

const noEnd = await editor("PUT", `/posts/${POST}/trim`, { as: U.layla, body: { start: 2 } });
check("a trim with no end is refused", noEnd._http === 422);

const notMine = await editor("PUT", `/posts/${POST}/trim`, { as: U.omar, body: { start: 0, end: 5 } });
check("someone else cannot trim your post", notMine._http === 403);

const ghost = await editor("GET", "/posts/6a830332316418fdbc5120ff", { as: U.layla });
check("editing a post that does not exist is a 404", ghost._http === 404);

/* ================================================================== */
section("4. Video Editing Suite — text overlays");

const fonts = await editor("GET", "/fonts");
check("the font list is served", (fonts.fonts || []).length >= 4);
check("and says which fonts can render Arabic at all",
  (fonts.arabicCapable || []).includes("default") && !(fonts.arabicCapable || []).includes("neon"));

const text1 = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla,
  body: { overlays: [
    { id: "a", text: "Hello Dubai", x: 0.5, y: 0.2, font: "modern", fontSize: 32, color: "#ffcc00" },
    { id: "b", text: "مرحبا", x: 0.5, y: 0.8, font: "default", startAt: 2, endAt: 9 },
  ] },
});
check("text overlays are saved", (text1.edit?.overlays || []).length === 2);
check("an Arabic caption survives intact", text1.edit?.overlays?.[1]?.text === "مرحبا");
check("positions are kept as fractions of the frame", text1.edit?.overlays?.[0]?.x === 0.5);
check("timing is kept where it was given", text1.edit?.overlays?.[1]?.endAt === 9);
check("and defaults fill in the rest", text1.edit?.overlays?.[1]?.align === "center");
check("the revision moved again", text1.edit?.revision === 2);

const replaced = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla, body: { overlays: [{ id: "c", text: "Only this one" }] },
});
check("a save replaces the set rather than appending to it",
  (replaced.edit?.overlays || []).length === 1 && replaced.edit.overlays[0].id === "c");

const offFrame = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla, body: { overlays: [{ id: "d", text: "off", x: 1.4 }] },
});
check("a position outside the frame is refused", offFrame._http === 422);

const noText = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla, body: { overlays: [{ id: "e", text: "   " }] },
});
check("an empty caption is refused", noText._http === 422);

const badFont = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla, body: { overlays: [{ id: "f", text: "hi", font: "comic-sans" }] },
});
check("a font the renderer does not have is refused", badFont._http === 422);

const badColor = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla, body: { overlays: [{ id: "g", text: "hi", color: "reddish" }] },
});
check("a colour that is not a hex value is refused", badColor._http === 422);

const badTiming = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla, body: { overlays: [{ id: "h", text: "hi", startAt: 8, endAt: 3 }] },
});
check("a caption that ends before it starts is refused", badTiming._http === 422);

const pastClip = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla, body: { overlays: [{ id: "i", text: "hi", startAt: 1, endAt: 400 }] },
});
check("a caption running past the end of the clip is refused", pastClip._http === 422);

const dupes = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla, body: { overlays: [{ id: "x", text: "one" }, { id: "x", text: "two" }] },
});
check("two overlays with the same id are refused", dupes._http === 422);

const tooMany = await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla,
  body: { overlays: Array.from({ length: 21 }, (_, i) => ({ id: `t${i}`, text: `n${i}` })) },
});
check("more overlays than a frame can hold are refused", tooMany._http === 422);

await editor("PUT", `/posts/${POST}/text`, {
  as: U.layla, body: { overlays: [{ id: "keep", text: "keep" }, { id: "drop", text: "drop" }] },
});
const dropped = await editor("DELETE", `/posts/${POST}/text/drop`, { as: U.layla });
check("one overlay can be removed without resending the rest",
  (dropped.edit?.overlays || []).length === 1 && dropped.edit.overlays[0].id === "keep");

const dropGhost = await editor("DELETE", `/posts/${POST}/text/nope`, { as: U.layla });
check("removing an overlay that is not there is a 404", dropGhost._http === 404);

const cleared = await editor("PUT", `/posts/${POST}/text`, { as: U.layla, body: { overlays: null } });
check("text can be cleared entirely", (cleared.edit?.overlays || []).length === 0);
check("and the trim is still where it was", cleared.edit?.trim?.end === 12.5);

const reset = await editor("POST", `/posts/${POST}/reset`, { as: U.layla });
check("the whole edit can be discarded", reset.edit?.trim === null && reset.edit.overlays.length === 0);

const stillThere = await db.collection("reels").findOne({ _id: OID(POST) }, { projection: { media: 1 } });
check("and the original media is still exactly what was uploaded",
  stillThere?.media?.[0]?.duration === 30);

/* the filters third of this row, verified rather than rebuilt */
const filters = await posting("GET", "/filters");
check("the filter catalogue shipped on 18 Aug still serves", (filters.total || 0) > 0);
check("grouped so the capture screen can build its trays", !!filters.byKind);

/* ================================================================== */
section("5. Music Library Integration");

const music = await posting("GET", "/music");
check("the library lists", Array.isArray(music.tracks) && music.tracks.length > 0);
const TRACK = music.tracks[0]?._id;

const genres = await posting("GET", "/music/genres");
check("genres are derived from the tracks themselves", Array.isArray(genres.genres));
check("and every genre offered has something behind it",
  (genres.genres || []).every((g) => g.count > 0 && g.genre));

const trending = await posting("GET", "/music/trending");
check("trending serves", Array.isArray(trending.tracks));

const saved0 = await posting("GET", "/music/saved", { as: U.layla });
check("a fresh account has saved nothing", saved0.total === 0);

const save = await posting("POST", `/music/${TRACK}/save`, { as: U.layla });
check("a track can be saved", save.saved === true && save.count === 1);

const saveAgain = await posting("POST", `/music/${TRACK}/save`, { as: U.layla });
check("saving twice does not save twice", saveAgain.count === 1);

const saved1 = await posting("GET", "/music/saved", { as: U.layla });
check("and it comes back on the saved list", saved1.total === 1);
check("with the fields a picker needs", !!saved1.tracks?.[0]?.title || !!saved1.tracks?.[0]?.musicname);

const otherSaved = await posting("GET", "/music/saved", { as: U.omar });
check("saving is per person, not a flag on the shared catalogue", otherSaved.total === 0);

const saveGhost = await posting("POST", "/music/6a830332316418fdbc5120ff/save", { as: U.layla });
check("saving a track that is not in the library is a 404", saveGhost._http === 404);

const unsave = await posting("DELETE", `/music/${TRACK}/save`, { as: U.layla });
check("a track can be unsaved", unsave.saved === false && unsave.count === 0);

/* "saved" and "genres" must not be read as track ids */
const byId = await posting("GET", `/music/${TRACK}`, { as: U.layla });
check("a track still reads by id, so the static words did not shadow it", !!byId.track);

/* attaching still works — the row's original 60% */
const attach = await posting("POST", `/posts/${POST}/music`, {
  as: U.layla, body: { music: { track: TRACK, startAt: 5, duration: 15, volume: 0.6 } },
});
check("a track attaches to a post with its trim", attach.music?.startAt === 5);
check("and its volume", attach.music?.volume === 0.6);
await posting("POST", `/posts/${POST}/music`, { as: U.layla, body: { music: null } });

/* ================================================================== */
section("6. Cloud Storage Integration (AWS)");

const st = await storage("GET", "/status");
check("storage status is reported", st.success === true);
check("the driver is named rather than assumed", ["s3", "local"].includes(st.storage?.driver));
check("and it agrees with the helper", st.storage?.driver === storageStatus().driver);
check("no credential is ever echoed back",
  st.storage?.accessKeyId === undefined && st.storage?.secretAccessKey === undefined);
check("only whether one is present", typeof st.storage?.hasCredentials === "boolean");
check("the size ceiling is published so a client can check before uploading",
  st.storage?.maxUploadBytes === 100 * 1024 * 1024);

const configured = st.storage?.configured === true;
console.log(`  (this server reports driver=${st.storage?.driver}, configured=${configured})`);

const url = await storage("POST", "/upload-url", {
  as: U.layla, body: { filename: "holiday.mp4", contentType: "video/mp4", sizeBytes: 5_000_000 },
});
check("an upload can be requested", url.success === true);
check("the file kind is worked out from the name and type", url.kind === "video");
check("and a key is always allocated, whichever driver is in use", typeof url.key === "string" && url.key.length > 0);
check("the key is date-sharded and randomised, not the name the phone sent",
  /^uploads\/\d{4}\/\d{2}\/[0-9a-f]+-[0-9a-f]{24}\.mp4$/.test(url.key), url.key);

if (configured) {
  check("a presigned PUT is returned", typeof url.uploadUrl === "string" && url.uploadUrl.startsWith("https://"));
  check("with an expiry", url.expiresIn > 0);
} else {
  check("with no bucket, the fallback is named instead of returning a null URL",
    url.uploadUrl === null && url.fallback?.url === "/apis/posting/media/upload");
  check("and the client is told which field to post", url.fallback?.field === "file");
}

const tooBig = await storage("POST", "/upload-url", {
  as: U.layla, body: { filename: "huge.mp4", contentType: "video/mp4", sizeBytes: 900_000_000 },
});
check("an oversized file is refused before a URL is signed", tooBig._http === 413);

const badType = await storage("POST", "/upload-url", {
  as: U.layla, body: { filename: "script.exe", contentType: "application/x-msdownload" },
});
check("an unsupported file type is refused", badType._http === 422);

const noName = await storage("POST", "/upload-url", { as: U.layla, body: {} });
check("a request with no filename is refused", noName._http === 400);

const anon = await storage("POST", "/upload-url", { body: { filename: "a.jpg" } });
check("an upload URL is not handed to an anonymous caller", anon._http === 400);

const res1 = await storage("GET", "/resolve", { query: { key: "uploads/2026/08/abc.jpg" } });
check("a stored key resolves to an address", typeof res1.url === "string" && res1.url.length > 0);
check("and the driver decides its shape, not the client",
  configured ? res1.url.includes("amazonaws.com") : res1.url.startsWith("/uploads/") || res1.url.includes("/uploads/"));
check("the helper and the endpoint agree", res1.url === publicUrl("uploads/2026/08/abc.jpg"));

const already = await storage("GET", "/resolve", { query: { key: "https://cdn.example.com/x.jpg" } });
check("an address that is already absolute is left alone",
  already.url === "https://cdn.example.com/x.jpg");

const noKey = await storage("GET", "/resolve");
check("resolving nothing is refused", noKey._http === 400);

check("the kind helper reads a type from an extension when the mime is missing",
  kindOf("song.mp3", "") === "audio" && kindOf("a.png", "") === "image" && kindOf("a.txt", "") === null);

const k1 = buildKey({ userId: U.layla, filename: "a.jpg" });
const k2 = buildKey({ userId: U.layla, filename: "a.jpg" });
check("two uploads of the same filename never collide", k1 !== k2);

/* ================================================================== */
section("Cleanup");

await restoreAll();

const after = {
  reels: await db.collection("reels").countDocuments({}),
  musictbls: await db.collection("musictbls").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
};
for (const key of Object.keys(baseline)) {
  check(`${key} restored to baseline (${baseline[key]})`, after[key] === baseline[key], `now ${after[key]}`);
}

const drift = [];
for (const id of FIXTURES) {
  const u = await db.collection("users").findOne({ _id: OID(id) },
    { projection: { name: 1, appearance: 1, savedMusic: 1 } });
  if ((u.savedMusic || []).length !== before[id].savedMusic.length) drift.push(`${u.name} savedMusic`);
  if (!!u.appearance !== (before[id].appearance !== null)) drift.push(`${u.name} appearance`);
}
check("every demo account is back to where it started", drift.length === 0, drift.join(", "));

const editLeft = await db.collection("reels").countDocuments({ edit: { $exists: true } });
check("no post is left carrying an edit", editLeft === 0, `${editLeft} left`);

await mongoose.disconnect();

/* ================================================================== */
console.log(`\n${"=".repeat(66)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`\n  Failing checks:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log("=".repeat(66));
process.exitCode = failed ? 1 : 0;
