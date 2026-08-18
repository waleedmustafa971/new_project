/*
  Discovery & Search — shared matching, scoring and normalisation.

  The controller asks these for "how well does this match?" and "how hot is
  this right now?" so that relevance means the same thing in unified search,
  hashtag search, creator discovery and topic trending.
*/

import mongoose from "mongoose";

export const isId = (v) => mongoose.Types.ObjectId.isValid(v);
export const oid = (v) => new mongoose.Types.ObjectId(String(v));

/* A user-supplied term is never interpolated into a RegExp unescaped. */
export const escapeRx = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Normalised search term: lowercased, whitespace collapsed, a leading # dropped. */
export const normalizeTerm = (s = "") =>
  String(s).trim().replace(/\s+/g, " ").replace(/^#/, "").toLowerCase();

/*
  Relevance of a candidate string against the query.

  Ordered so that an exact match always beats a prefix match, and a prefix
  always beats a match buried in the middle — searching "art" should surface
  #art before #heartbroken, which a plain `contains` regex gets backwards.
  Shorter matches score higher at the same tier, because a query is a larger
  fraction of a short name.
*/
export const textRelevance = (candidate = "", query = "") => {
  const c = String(candidate).toLowerCase();
  const q = normalizeTerm(query);
  if (!c || !q) return 0;

  const idx = c.indexOf(q);
  if (idx === -1) {
    // Every word of the query present, but not contiguous — still a match,
    // scored well below a contiguous one.
    const words = q.split(" ").filter(Boolean);
    if (words.length > 1 && words.every((w) => c.includes(w))) return 12;
    return 0;
  }

  const coverage = q.length / c.length;          // 0..1
  if (c === q) return 100;
  if (idx === 0) return 70 + coverage * 20;      // prefix
  // Match starting at a word boundary reads as more relevant than mid-word.
  if (/\s|[-_]/.test(c[idx - 1])) return 45 + coverage * 15;
  return 25 + coverage * 15;
};

/*
  Recency multiplier, halving roughly every `halfLifeHours`.

  Discovery uses a gentler decay than the main feed: a good result from last
  week should still be findable, whereas the timeline is about what is new.
*/
export const recencyBoost = (date, halfLifeHours = 168) => {
  if (!date) return 0.5;
  const hours = (Date.now() - new Date(date).getTime()) / 3600000;
  if (hours < 0) return 1;
  return Math.pow(0.5, hours / halfLifeHours);
};

/* Interactions on a post, weighted by the effort each one takes. */
export const engagementOf = (doc) => {
  const n = (a) => (Array.isArray(a) ? a.length : 0);
  return (
    n(doc.likes) * 1 +
    n(doc.comments) * 3 +
    n(doc.shares) * 4 +
    n(doc.savepost) * 2 +
    (doc.viewsCount || 0) * 0.05
  );
};

/*
  Rescale a ranked list onto 0-100 relative to its leader.

  Raw discovery scores are unbounded and decay steeply, so over a long window
  they collapse toward zero and all round to the same number. Rank order is
  what the screen shows, so each row is reported relative to the top one — the
  same treatment the trending feed already uses.
*/
export const heatScale = (rows, get) => {
  const top = rows.length ? get(rows[0]) : 0;
  return (row) => (top > 0 ? Math.round((get(row) / top) * 100) : 0);
};

/*
  Spike detection.

  A topic with 10 posts that had 2 last week is moving; one with 50 posts that
  always has 50 is simply big. `velocity` is the ratio of this window's rate to
  the previous window's, so "rising" is separable from "popular" — without it a
  trending list is just a list of the biggest tags, permanently.
*/
export const velocityOf = (nowCount, priorCount) => {
  if (nowCount <= 0) return 0;
  // A tag appearing from nothing is the strongest possible signal, but it is
  // capped so a single post out of zero history cannot top the board.
  if (priorCount <= 0) return Math.min(1 + nowCount, 5);
  return Math.round((nowCount / priorCount) * 100) / 100;
};

/*
  Geo guard: the users schema defaults `location.coordinates` to [0, 0], which
  is a real point in the Gulf of Guinea rather than a null island. Any query
  that treats it as "has a location" reports every default-valued account as
  nearby. This is the filter every geo query in the controller applies.
*/
export const HAS_REAL_LOCATION = {
  "location.coordinates": { $exists: true, $ne: [0, 0], $not: { $size: 0 } },
};

/* Great-circle distance in km, for sorting results already fetched. */
export const distanceKm = ([lng1, lat1], [lng2, lat2]) => {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

/*
  Shape a creator row for any of the discovery surfaces. One shape so the
  "who to follow" rail, the nearby rail and the top-creators board are
  interchangeable on the client.
*/
export const shapeCreator = (u, extras = {}) => ({
  _id: u._id,
  name: u.name,
  image: u.image || null,
  bio: u.bio || "",
  verifiedBadge: !!u.verifiedBadge,
  accountType: u.accountType || "personal",
  followers: (u.followers || []).length,
  city: u.city || null,
  country: u.country || null,
  ...extras,
});

/* ------------------------------------------------------------------ */
/* place resolution                                                    */
/* ------------------------------------------------------------------ */

/*
  Check-ins are stored as a free-text `place.name` with `city` and `country`
  both optional, so the same city arrives in several shapes: "Dubai" with a
  structured city, and "Dubai, UAE" with nothing structured at all. Grouping on
  the raw name therefore produces two rows for one city, files a city as though
  it were a venue, and loses the country into the middle of a string.

  This resolves a stored place into three explicit parts. It runs at read time
  rather than rewriting stored posts: the create path is shipped and the mobile
  app still writes the old shape, so the parse has to cope with existing rows
  either way.

  Rule, applied only when the structured fields are absent:
    "Burj Khalifa, Dubai, UAE" -> venue "Burj Khalifa", city "Dubai", country "UAE"
    "Abu Dhabi, UAE"           -> venue null, city "Abu Dhabi", country "UAE"
    "Social Lab HQ"            -> venue "Social Lab HQ", city from place.city

  A two-part name is read as city + country rather than venue + city, because
  that is what check-in pickers actually emit. `venue: null` is the signal that
  a check-in is city-level, which is what lets a browse list keep specific
  places separate from the regions containing them.
*/
export const resolvePlace = (place = {}) => {
  const raw = String(place.name || "").trim();
  const parts = raw.split(",").map((x) => x.trim()).filter(Boolean);

  let venue = null;
  let city = place.city ? String(place.city).trim() : null;
  let country = place.country ? String(place.country).trim() : null;

  if (parts.length >= 3) {
    venue = parts.slice(0, -2).join(", ");
    city = city || parts[parts.length - 2];
    country = country || parts[parts.length - 1];
  } else if (parts.length === 2) {
    city = city || parts[0];
    country = country || parts[1];
    // Structured city present and different from the parsed one: the name is
    // then a venue that merely happens to carry a comma.
    if (place.city && normalizeTerm(place.city) !== normalizeTerm(parts[0])) venue = raw;
  } else if (parts.length === 1) {
    // A lone name is a venue only when we know the city it sits in; otherwise
    // it is the city itself.
    if (city && normalizeTerm(city) !== normalizeTerm(parts[0])) venue = parts[0];
    else city = city || parts[0];
  }

  return {
    venue: venue || null,
    city: city || null,
    country: country || null,
    // What to show as the most specific label available.
    label: venue || city || raw || null,
    // Stable grouping keys, so "Dubai" and "Dubai, UAE" land in one bucket.
    venueKey: venue ? normalizeTerm(venue) : null,
    cityKey: city ? normalizeTerm(city) : null,
    raw,
  };
};

/*
  Does a stored place match a name the caller asked for? Compares against every
  resolved part, so /locations/Dubai finds check-ins stored as "Dubai",
  "Dubai, UAE" and "Burj Khalifa, Dubai, UAE" alike.
*/
export const placeMatches = (place, name) => {
  const want = normalizeTerm(name);
  if (!want) return false;
  const r = resolvePlace(place);
  return [r.venueKey, r.cityKey, normalizeTerm(r.raw)].filter(Boolean).includes(want);
};
