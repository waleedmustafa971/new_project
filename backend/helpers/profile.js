/*
  Profile — shared validation, normalisation and the interest catalogue.

  The four things this section owns (bio, gender, location, birthday and the
  interest picker) are all "a string the client sent us", so the value is
  entirely in validating them consistently. That lives here rather than in the
  controller so the signup path and the edit-profile path cannot disagree.
*/

import mongoose from "mongoose";

export const isId = (v) => mongoose.Types.ObjectId.isValid(v);
export const oid = (v) => new mongoose.Types.ObjectId(String(v));

export const BIO_MAX = 300;

/*
  Gender is an open field with a suggested list rather than a closed enum:
  a fixed enum forces people into a wrong answer, and the sheet only asks that
  the value be captured. Anything outside the list is kept verbatim, trimmed
  and length-capped.
*/
export const GENDER_SUGGESTIONS = [
  "female", "male", "non-binary", "prefer not to say",
];

export const normalizeGender = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s.length > 40) return undefined;          // undefined = reject
  const lower = s.toLowerCase();
  // Fold the common variants onto the suggested spelling so filters group.
  const alias = {
    f: "female", w: "female", woman: "female",
    m: "male", man: "male",
    nb: "non-binary", enby: "non-binary", nonbinary: "non-binary",
    "": null,
  };
  return alias[lower] || (GENDER_SUGGESTIONS.includes(lower) ? lower : s);
};

/* Minimum age to hold an account, and the oldest plausible birth date. */
export const MIN_AGE = 13;
export const MAX_AGE = 120;

/*
  Split a date input into calendar parts without ever crossing a timezone.

  This matters more than it looks. `new Date("1996-04-17")` is parsed as UTC
  midnight, while `new Date("17 April 1996")` is parsed as *local* midnight —
  so serialising either with toISOString() shifts one of them by a day
  depending on which side of UTC the server sits on. A birthday has no time
  and no timezone; it is three numbers. So ISO input is read digit-for-digit,
  and anything else is parsed once and read back in local parts.

  Returns { y, m, d } (m is 1-12) or null.
*/
const birthParts = (v) => {
  const raw = String(v ?? "").trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    // Reject impossible dates that the regex alone would accept (2023-02-31).
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
      return null;
    }
    return { y, m, d };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return { y: parsed.getFullYear(), m: parsed.getMonth() + 1, d: parsed.getDate() };
};

const pad = (n) => String(n).padStart(2, "0");
export const toISODate = (parts) => `${parts.y}-${pad(parts.m)}-${pad(parts.d)}`;

/*
  Parse and validate a birthday.

  Returns { date, age } or { error }. The stored field is a String on the
  schema and existing rows hold assorted formats, so this accepts anything
  Date can parse but always writes back ISO yyyy-mm-dd — otherwise sorting and
  age arithmetic depend on whichever format a given client happened to send.
*/
export const parseBirthday = (v) => {
  if (!String(v ?? "").trim()) return { error: "A date of birth is required" };

  const parts = birthParts(v);
  if (!parts) return { error: "That date of birth isn't a valid date" };

  const now = new Date();
  const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  const isFuture =
    parts.y > today.y ||
    (parts.y === today.y && parts.m > today.m) ||
    (parts.y === today.y && parts.m === today.m && parts.d > today.d);
  if (isFuture) return { error: "A date of birth can't be in the future" };

  const age = ageFrom(v);
  if (age === null) return { error: "That date of birth isn't a valid date" };
  if (age < MIN_AGE) return { error: `You must be at least ${MIN_AGE} to use this app` };
  if (age > MAX_AGE) return { error: "That date of birth doesn't look right" };

  return { date: toISODate(parts), age };
};

/*
  Whole years elapsed. Computed from calendar parts rather than by dividing a
  millisecond difference, which drifts by a day across leap years and can
  report someone as 17 on their 18th birthday.
*/
export const ageFrom = (v) => {
  const parts = birthParts(v);
  if (!parts) return null;
  const now = new Date();
  let age = now.getFullYear() - parts.y;
  const m = (now.getMonth() + 1) - parts.m;
  if (m < 0 || (m === 0 && now.getDate() < parts.d)) age -= 1;
  return age;
};

/* Is today their birthday? Used to badge a profile. */
export const isBirthdayToday = (v) => {
  const parts = birthParts(v);
  if (!parts) return false;
  const now = new Date();
  return parts.d === now.getDate() && parts.m === now.getMonth() + 1;
};

/*
  The interest picker's catalogue.

  Grouped, because the signup screen shows categories; the ids are stable
  lowercase slugs so a stored interest survives a label being reworded. Free
  text is still accepted alongside these — the catalogue is a suggestion list,
  not a whitelist — but anything matching a slug is folded onto it so that
  "Photography" and "photography" are one interest for discovery.
*/
export const INTEREST_CATALOGUE = [
  { category: "Creative", interests: [
    "photography", "videography", "design", "writing", "music", "drawing", "fashion",
  ]},
  { category: "Active", interests: [
    "football", "running", "gym", "cycling", "swimming", "hiking", "yoga", "martial-arts",
  ]},
  { category: "Food & Drink", interests: [
    "cooking", "baking", "coffee", "restaurants", "street-food",
  ]},
  { category: "Travel & Outdoors", interests: [
    "travel", "camping", "desert", "beaches", "road-trips",
  ]},
  { category: "Tech & Business", interests: [
    "technology", "startups", "programming", "crypto", "investing", "cars",
  ]},
  { category: "Life", interests: [
    "family", "pets", "gaming", "movies", "reading", "volunteering", "home-decor",
  ]},
];

export const CATALOGUE_SLUGS = new Set(
  INTEREST_CATALOGUE.flatMap((g) => g.interests)
);

export const MAX_INTERESTS = 20;

/* Slugify so free text and catalogue entries share one comparable form. */
export const slugifyInterest = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/*
  Clean a submitted interest list: slugified, de-duplicated, empties dropped,
  capped. Returns { interests } or { error }.
*/
export const cleanInterests = (list) => {
  if (!Array.isArray(list)) return { error: "interests must be a list" };
  const out = [];
  for (const raw of list) {
    const slug = slugifyInterest(raw);
    if (!slug) continue;
    if (!out.includes(slug)) out.push(slug);
  }
  if (out.length > MAX_INTERESTS) {
    return { error: `Pick at most ${MAX_INTERESTS} interests` };
  }
  return { interests: out };
};

/* Which catalogue category an interest belongs to, or null for free text. */
export const categoryOf = (slug) =>
  INTEREST_CATALOGUE.find((g) => g.interests.includes(slug))?.category || null;

/*
  Coordinates guard, shared with discovery: the schema writes [0, 0] by
  default, which is a real point rather than an empty value.
*/
export const validCoords = (lng, lat) =>
  Number.isFinite(lng) && Number.isFinite(lat) &&
  lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90 &&
  !(lng === 0 && lat === 0);

/*
  Public shape of a profile. `self` decides what the viewer is allowed to see
  of the sensitive fields: the exact birth date is never shown to anyone else,
  only the derived age — a full date of birth is an identity document, an age
  is a fact about a person.
*/
export const shapeProfile = (u, { self = false, extras = {} } = {}) => {
  const age = ageFrom(u.dateofbirth);
  return {
    _id: u._id,
    name: u.name || "",
    firstname: u.firstname || "",
    lastname: u.lastname || "",
    image: u.image || null,
    bio: u.bio || "",
    gender: u.gender || null,
    nationality: u.nationality || null,
    city: u.city || null,
    country: u.country || null,
    location: u.location?.coordinates?.length &&
      !(u.location.coordinates[0] === 0 && u.location.coordinates[1] === 0)
        ? { lng: u.location.coordinates[0], lat: u.location.coordinates[1] }
        : null,
    age,
    birthdayToday: isBirthdayToday(u.dateofbirth),
    interests: u.interests?.length ? u.interests : (u.interest ? [slugifyInterest(u.interest)] : []),
    verifiedBadge: !!u.verifiedBadge,
    accountType: u.accountType || "personal",
    followers: (u.followers || []).length,
    following: (u.following || []).length,
    ...(self ? { dateofbirth: u.dateofbirth || null, email: u.email } : {}),
    ...extras,
  };
};
