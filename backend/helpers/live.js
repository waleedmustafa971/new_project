// helpers/live.js

/*
  Shared rules for the Live Streaming module.

  The rank and restriction checks live here rather than in either controller
  because both need them and they must not drift: the chat path asks "is this
  person muted?" on every send, and the moderation path asks "may this person
  mute?" on every action. Two copies of that answer is how a muted user ends up
  able to talk through an endpoint nobody re-checked.
*/

import mongoose from "mongoose";

export const SEAT_LIMIT = 4;

// Longest a single chat line may be. Matches the model's maxlength; checked
// here too so an over-long line is a 400 and not a mongoose validation 500.
export const CHAT_MAX_LENGTH = 500;

export const oid = (v) => new mongoose.Types.ObjectId(String(v));
export const sameId = (a, b) => String(a) === String(b);

export const activeSeats = (stream) =>
  (stream.cohoster || []).filter((c) => c.status === "approved");

export const liveViewers = (stream) =>
  (stream.viewers || []).filter((v) => !v.leftAt);

/* ------------------------------------------------------------------ */
/* rank                                                                */
/* ------------------------------------------------------------------ */

export const isHost = (stream, userId) =>
  !!userId && sameId(stream.hoster?._id || stream.hoster, userId);

export const isModerator = (stream, userId) =>
  !!userId && (stream.moderators || []).some((m) => sameId(m.user?._id || m.user, userId));

// Who may kick, ban, mute and delete messages.
export const canModerate = (stream, userId) =>
  isHost(stream, userId) || isModerator(stream, userId);

/*
  Whether `actor` outranks `target` for a moderation action.

  Host outranks everyone. A moderator outranks ordinary viewers but not another
  moderator and not the host — without that second rule two moderators can ban
  each other, and the last one standing owns the room.
*/
export const outranks = (stream, actorId, targetId) => {
  if (sameId(actorId, targetId)) return false;
  if (isHost(stream, targetId)) return false;
  if (isHost(stream, actorId)) return true;
  if (!isModerator(stream, actorId)) return false;
  return !isModerator(stream, targetId);
};

/* ------------------------------------------------------------------ */
/* restrictions                                                        */
/* ------------------------------------------------------------------ */

/*
  A restriction bites when it has not been lifted and has not expired. `until`
  of null is indefinite. Expiry is evaluated at read time rather than swept by a
  job, so a five-minute mute lapses without anything having to run.
*/
export const restrictionActive = (r, now = new Date()) =>
  !r.liftedAt && (!r.until || new Date(r.until) > now);

export const findRestriction = (stream, userId, type, now = new Date()) =>
  (stream.restrictions || []).find(
    (r) => r.type === type && sameId(r.user?._id || r.user, userId) && restrictionActive(r, now)
  ) || null;

export const isBanned = (stream, userId) => !!findRestriction(stream, userId, "ban");
export const isMuted = (stream, userId) => !!findRestriction(stream, userId, "mute");

export const shapeRestriction = (r) => ({
  _id: r._id,
  user: r.user && typeof r.user === "object"
    ? { _id: r.user._id, name: r.user.name, image: r.user.image }
    : { _id: r.user },
  type: r.type,
  reason: r.reason || "",
  until: r.until || null,
  permanent: !r.until,
  at: r.at,
  by: r.by || null,
  active: restrictionActive(r),
  liftedAt: r.liftedAt || null,
});

/*
  Minutes → an expiry date. `0`, null or a missing value all mean indefinite,
  which is the sensible reading of "ban this person" with no duration given.
*/
export const untilFrom = (minutes) => {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(Date.now() + Math.min(n, 60 * 24 * 30) * 60 * 1000);
};
