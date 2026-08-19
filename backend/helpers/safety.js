// helpers/safety.js

/*
  Shared rules for the Safety & Privacy section.

  Three questions live here because more than one caller asks them and the
  answers must not drift: is this person restricted, is this viewer old enough,
  and may this viewer see this particular post. The feed, the profile and the
  post endpoints all need the same answer, and three copies of "can they see
  it?" is how a private post leaks through the one endpoint nobody updated.
*/

import crypto from "crypto";
import mongoose from "mongoose";

import User from "../models/users.js";

export const oid = (v) => new mongoose.Types.ObjectId(String(v));
export const sameId = (a, b) => String(a) === String(b);
const hasId = (list, id) => (list || []).some((x) => sameId(x?._id || x, id));

/* ------------------------------------------------------------------ */
/* restriction                                                         */
/* ------------------------------------------------------------------ */

/*
  Is `otherId` restricted by `ownerId`?

  One-directional on purpose. The restricted person is never told, and nothing
  in any response may reveal it — which is why callers use this to *shape* a
  response rather than to refuse one. A 403 saying "you are restricted" would
  defeat the entire feature.
*/
export const isRestrictedBy = async (ownerId, otherId, ownerDoc = null) => {
  if (!ownerId || !otherId || sameId(ownerId, otherId)) return false;
  const owner = ownerDoc || await User.findById(ownerId).select("restrictedUsers").lean();
  return hasId(owner?.restrictedUsers, otherId);
};

/* ------------------------------------------------------------------ */
/* age                                                                 */
/* ------------------------------------------------------------------ */

// The floor for holding an account at all, and for seeing restricted content.
export const MINIMUM_AGE = 13;
export const ADULT_AGE = 18;

/*
  Age from a date of birth.

  `dateofbirth` is a free-text string on this model and arrives in several
  shapes ("1996-04-17", "17 April 1996"), so it is parsed defensively and an
  unparseable value returns null rather than a wrong number. Callers treat null
  as "unknown", never as "old enough".
*/
export const ageFrom = (dateofbirth) => {
  if (!dateofbirth) return null;

  const raw = String(dateofbirth).trim();
  let year, month, day;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    // Read digit-for-digit. `new Date("1996-04-17")` is UTC midnight while
    // `new Date("17 April 1996")` is local midnight, and that hour of drift is
    // enough to change an age on a birthday.
    [, year, month, day] = iso.map(Number);
  } else {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    year = parsed.getFullYear();
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  }

  if (!year || year < 1900 || year > new Date().getFullYear()) return null;

  const now = new Date();
  let age = now.getFullYear() - year;
  const monthNow = now.getMonth() + 1;
  const dayNow = now.getDate();
  // Birthday not yet reached this year.
  if (monthNow < month || (monthNow === month && dayNow < day)) age -= 1;

  return age >= 0 && age < 130 ? age : null;
};

/*
  Whether a viewer may see age-restricted content.

  An unknown date of birth is treated as *not* old enough. The alternative —
  defaulting to allowed — means every account that never filled in a birthday
  sees restricted content, which is the exact failure the row exists to prevent.
  Demo accounts mostly have no date of birth, so this is the common path, not
  an edge case.
*/
export const meetsAgeGate = (user, minimum = ADULT_AGE) => {
  const age = ageFrom(user?.dateofbirth);
  return age !== null && age >= minimum;
};

/* ------------------------------------------------------------------ */
/* post visibility                                                     */
/* ------------------------------------------------------------------ */

/*
  May `viewer` see `post`?

  Returns a reason as well as a verdict, because the caller usually has to tell
  the difference between "this is private" and "you are too young" when
  deciding what to render in place of the post.

  The per-post `audience` overrides the account-level setting rather than
  combining with it: a public post on a followers-only account is the whole
  point of a per-post control, and ANDing the two would make that impossible.
*/
export const canViewPost = async (viewerId, post, { author = null, viewer = null } = {}) => {
  if (!post) return { allowed: false, reason: "not found" };

  // The author on this model is `username` (an ObjectId ref), which reads as a
  // string field and is the single easiest thing to get wrong here.
  const authorId = post.username || post.userid || post.user || post.author;
  if (viewerId && sameId(viewerId, authorId)) return { allowed: true, reason: "author" };

  // An admin-hidden post is gone for everyone but its author.
  if (post.status === "hidden") return { allowed: false, reason: "removed by moderation" };

  const audience = post.audience || "everyone";
  if (audience === "onlyMe") return { allowed: false, reason: "private to the author" };

  if (post.ageRestricted) {
    const v = viewer || (viewerId ? await User.findById(viewerId).select("dateofbirth").lean() : null);
    if (!meetsAgeGate(v)) return { allowed: false, reason: "age restricted" };
  }

  if (audience === "everyone") return { allowed: true, reason: "public" };
  if (!viewerId) return { allowed: false, reason: "sign in to view" };

  const owner = author || await User.findById(authorId).select("followers closeFriends blockedUsers").lean();
  if (!owner) return { allowed: false, reason: "author not found" };

  if (hasId(owner.blockedUsers, viewerId)) return { allowed: false, reason: "blocked" };

  if (audience === "followers") {
    return hasId(owner.followers, viewerId)
      ? { allowed: true, reason: "follower" }
      : { allowed: false, reason: "followers only" };
  }
  if (audience === "closeFriends") {
    return hasId(owner.closeFriends, viewerId)
      ? { allowed: true, reason: "close friend" }
      : { allowed: false, reason: "close friends only" };
  }

  return { allowed: true, reason: "public" };
};

/* ------------------------------------------------------------------ */
/* device fingerprint                                                  */
/* ------------------------------------------------------------------ */

/*
  A stable id for the device a sign-in came from.

  Built from what the client volunteers. A explicit `deviceId` is used alone
  when present, because it survives a browser upgrade that would change the
  user agent and otherwise fire a false alert on every update.
*/
export const fingerprintOf = ({ deviceId, userAgent, platform } = {}) => {
  const basis = deviceId
    ? `id:${deviceId}`
    : `ua:${String(userAgent || "").slice(0, 200)}|p:${platform || ""}`;
  return crypto.createHash("sha256").update(basis).digest("hex").slice(0, 32);
};
