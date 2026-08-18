/*
  User Account & Profile — mobile-facing API.

  Covers three rows the sheet marks 80 % complete but still budgets a day each:
    Bio, Gender, Location & Birthday
    User Interests & Hobbies Selection
    Follow / Unfollow & Friends System

  Mounted at /apis/profile. The legacy endpoints stay exactly as they are —
  /apis/auth/editprofile, /apis/auth/update-interest, /apis/auth/update_dateofbirth
  and /apis/reel/Addfollow all keep working and keep their response shapes.

  What was actually missing, and why these were never really 80 %:
    - editProfile wrote only name/email/bio/mobileno, so gender, location and
      birthday had no edit path at all
    - dateofbirth is a free String with no validation, so any text was storable
      and no age could be derived from it
    - update-interest holds a single String, and sends no response when the
      user is not found, leaving the request hanging
    - there was no friends concept anywhere, and the follow list returned both
      full arrays unpaginated with no relationship state
*/

import mongoose from "mongoose";
import User from "../models/users.js";
import {
  isId, oid, BIO_MAX, GENDER_SUGGESTIONS, normalizeGender,
  parseBirthday, ageFrom, shapeProfile,
  INTEREST_CATALOGUE, CATALOGUE_SLUGS, MAX_INTERESTS,
  cleanInterests, categoryOf, slugifyInterest, validCoords,
} from "../helpers/profile.js";
import { relationship, needsFollowApproval, hiddenUserIds } from "../helpers/privacy.js";
import { notify } from "../services/notificationService.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[profile]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 20) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const CARD_FIELDS = "name image bio verifiedBadge accountType privacy privacySettings followers following city country";

/* ================================================================== */
/* 1. Bio, gender, location & birthday                                 */
/* ================================================================== */

export const getMyProfile = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId)
    .select("-password -otpcode -fcm_token -fcm_tokens -logs")
    .lean();
  if (!me) return fail(res, 404, "User not found");

  ok(res, {
    profile: shapeProfile(me, {
      self: true,
      extras: {
        // What the edit screen needs to render its completeness nudge.
        completeness: profileCompleteness(me),
      },
    }),
  });
});

/* Which of the profile fields this section owns are still empty. */
const profileCompleteness = (u) => {
  const checks = {
    name: !!String(u.name || "").trim(),
    image: !!u.image,
    bio: !!String(u.bio || "").trim(),
    gender: !!u.gender,
    birthday: ageFrom(u.dateofbirth) !== null,
    location: !!(u.city || u.country || (u.location?.coordinates?.length &&
      !(u.location.coordinates[0] === 0 && u.location.coordinates[1] === 0))),
    interests: (u.interests || []).length > 0,
  };
  const done = Object.values(checks).filter(Boolean).length;
  return {
    percent: Math.round((done / Object.keys(checks).length) * 100),
    missing: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k),
  };
};

/*
  Update the profile fields.

  Every field is optional and only the keys actually present are written, so a
  screen that edits one field cannot blank the others by omitting them — which
  is what a whole-object PUT does the first time a client is out of date.
*/
export const updateMyProfile = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId).select("_id").lean();
  if (!me) return fail(res, 404, "User not found");

  const b = req.body || {};
  const patch = {};

  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (!name) return fail(res, 400, "Name can't be empty");
    if (name.length > 60) return fail(res, 400, "Name is too long (60 characters max)");
    patch.name = name;
  }
  if (b.firstname !== undefined) patch.firstname = String(b.firstname).trim().slice(0, 40);
  if (b.lastname !== undefined) patch.lastname = String(b.lastname).trim().slice(0, 40);

  if (b.bio !== undefined) {
    const bio = String(b.bio).trim();
    if (bio.length > BIO_MAX) return fail(res, 400, `Bio is too long (${BIO_MAX} characters max)`);
    patch.bio = bio;
  }

  if (b.gender !== undefined) {
    const g = normalizeGender(b.gender);
    if (g === undefined) return fail(res, 400, "That gender value is too long (40 characters max)");
    patch.gender = g;
  }

  if (b.nationality !== undefined) patch.nationality = String(b.nationality).trim().slice(0, 60) || null;

  if (b.dateofbirth !== undefined) {
    const { date, age, error } = parseBirthday(b.dateofbirth);
    if (error) return fail(res, 400, error);
    // Stored ISO regardless of what the client sent, so age arithmetic and
    // sorting do not depend on the client's date format.
    patch.dateofbirth = date;
    patch._age = age;   // stripped below; kept only for the response
  }

  /* location: a city/country pair, coordinates, or both */
  if (b.city !== undefined) patch.city = String(b.city).trim().slice(0, 80) || null;
  if (b.country !== undefined) patch.country = String(b.country).trim().slice(0, 80) || null;

  if (b.lng !== undefined || b.lat !== undefined) {
    const lng = parseFloat(b.lng);
    const lat = parseFloat(b.lat);
    // Clearing is explicit — sending null for both removes the point rather
    // than writing the schema's [0,0] default, which is a real place.
    if (b.lng === null && b.lat === null) {
      patch.location = undefined;
      patch.$unset = { location: "" };
    } else if (!validCoords(lng, lat)) {
      return fail(res, 400, "lng must be -180..180 and lat -90..90, and [0,0] is not a valid location");
    } else {
      patch.location = { type: "Point", coordinates: [lng, lat] };
    }
  }

  const age = patch._age;
  delete patch._age;
  const unset = patch.$unset;
  delete patch.$unset;

  if (!Object.keys(patch).length && !unset) {
    return fail(res, 400, "Nothing to update");
  }

  const update = { $set: { ...patch, updateby: new Date() } };
  if (unset) update.$unset = unset;

  const updated = await User.findByIdAndUpdate(userId, update, { new: true })
    .select("-password -otpcode -fcm_token -fcm_tokens -logs")
    .lean();

  ok(res, {
    message: "Profile updated",
    ...(age !== undefined ? { age } : {}),
    profile: shapeProfile(updated, { self: true, extras: { completeness: profileCompleteness(updated) } }),
  });
});

/* The suggestion list the gender field offers; not a closed set. */
export const genderOptions = wrap(async (req, res) =>
  ok(res, { options: GENDER_SUGGESTIONS, freeText: true })
);

/*
  Someone else's profile. The exact date of birth is never included — only the
  derived age — and blocked accounts are not readable at all.
*/
export const getProfile = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { userId } = req.params;
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const target = await User.findById(userId)
    .select("-password -otpcode -fcm_token -fcm_tokens -logs")
    .lean();
  if (!target || target.accountStatus === "deleted") return fail(res, 404, "User not found");

  const self = String(viewerId || "") === String(userId);
  if (!self && isId(viewerId)) {
    const rel = await relationship(viewerId, target);
    if (rel === "blocked") return fail(res, 403, "This profile is not available");
  }

  const rel = !self && isId(viewerId) ? await relationship(viewerId, target) : null;

  ok(res, {
    profile: shapeProfile(target, {
      self,
      extras: {
        isSelf: self,
        isFollowing: rel === "follower",
        requested: rel === "requested",
        isPrivate: needsFollowApproval(target),
      },
    }),
  });
});

/* ================================================================== */
/* 2. Interests & hobbies                                              */
/* ================================================================== */

export const interestCatalogue = wrap(async (req, res) =>
  ok(res, {
    categories: INTEREST_CATALOGUE,
    total: CATALOGUE_SLUGS.size,
    maxSelectable: MAX_INTERESTS,
    // Free text is allowed alongside the catalogue; it is slugified on save.
    freeText: true,
  })
);

export const getInterests = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId).select("interests interest").lean();
  if (!me) return fail(res, 404, "User not found");

  // Fall back to the legacy single-value field for accounts that predate the list.
  const list = me.interests?.length
    ? me.interests
    : (me.interest ? [slugifyInterest(me.interest)].filter(Boolean) : []);

  ok(res, {
    interests: list.map((slug) => ({
      slug,
      category: categoryOf(slug),
      inCatalogue: CATALOGUE_SLUGS.has(slug),
    })),
    maxSelectable: MAX_INTERESTS,
  });
});

/*
  Replace the whole selection. A picker submits its full state, so this is a
  PUT rather than an add/remove pair — an add-one endpoint makes deselecting
  the last item impossible to express.
*/
export const setInterests = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId).select("_id").lean();
  if (!me) return fail(res, 404, "User not found");

  const { interests, error } = cleanInterests(req.body?.interests);
  if (error) return fail(res, 400, error);

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        interests,
        // Legacy single-value field kept in step, so the old signup screen and
        // /apis/auth/update-interest keep reading something sensible.
        interest: interests[0] || "",
        updateby: new Date(),
      },
    },
    { new: true }
  ).select("interests").lean();

  ok(res, {
    message: interests.length ? "Interests saved" : "Interests cleared",
    interests: updated.interests.map((slug) => ({
      slug, category: categoryOf(slug), inCatalogue: CATALOGUE_SLUGS.has(slug),
    })),
  });
});

/* People who share interests with the viewer — what the picker is actually for. */
export const similarInterests = wrap(async (req, res) => {
  const userId = actorId(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId).select("interests interest following").lean();
  if (!me) return fail(res, 404, "User not found");

  const mine = me.interests?.length ? me.interests : [slugifyInterest(me.interest || "")].filter(Boolean);
  if (!mine.length) return ok(res, { interests: [], matches: [] });

  const hidden = await hiddenUserIds(userId);
  const exclude = [userId, ...(me.following || []).map(String), ...hidden.map(String)];

  const pool = await User.find({
    _id: { $nin: exclude.filter(isId).map(oid) },
    interests: { $in: mine },
    accountStatus: { $nin: ["banned", "deleted"] },
    $or: [
      { "privacySettings.discoverable": { $ne: false } },
      { privacySettings: { $exists: false } },
    ],
  })
    .select(`${CARD_FIELDS} interests`)
    .limit(200)
    .lean();

  const rows = pool
    .map((u) => {
      const shared = (u.interests || []).filter((i) => mine.includes(i));
      return { u, shared };
    })
    .filter((r) => r.shared.length)
    // Most overlap first; reach only breaks ties, so a small account with four
    // interests in common outranks a big one with a single match.
    .sort((a, b) => b.shared.length - a.shared.length ||
      (b.u.followers || []).length - (a.u.followers || []).length)
    .slice(0, limit);

  ok(res, {
    interests: mine,
    matches: rows.map(({ u, shared }) => ({
      _id: u._id, name: u.name, image: u.image || null, bio: u.bio || "",
      verifiedBadge: !!u.verifiedBadge,
      followers: (u.followers || []).length,
      sharedInterests: shared,
      isPrivate: needsFollowApproval(u),
    })),
  });
});

/* ================================================================== */
/* 3. Follow / unfollow & friends                                      */
/* ================================================================== */

/*
  A friend is a mutual follow. There is no separate friend request flow: the
  sheet lists friends alongside follow/unfollow, and maintaining a second
  accept/decline queue beside the follow-request one already shipped would give
  two ways to be connected to the same person and two places to break.
*/
const friendIdsOf = (u) => {
  const following = new Set((u.following || []).map(String));
  return (u.followers || []).map(String).filter((id) => following.has(id));
};

export const follow = wrap(async (req, res) => {
  const userId = actorId(req);
  const targetId = req.body?.targetId || req.params?.userId;
  if (!isId(userId) || !isId(targetId)) return fail(res, 400, "A valid userId and targetId are required");
  if (String(userId) === String(targetId)) return fail(res, 400, "You can't follow yourself");

  const target = await User.findById(targetId)
    .select("privacy privacySettings followers followRequests blockedUsers accountStatus")
    .lean();
  if (!target || target.accountStatus === "deleted") return fail(res, 404, "User not found");
  if (target.accountStatus === "banned") return fail(res, 403, "This profile is not available");

  const rel = await relationship(userId, target);
  if (rel === "blocked") return fail(res, 403, "This profile is not available");
  if (rel === "follower") return ok(res, { message: "Already following", status: "following" });
  if (rel === "requested") return ok(res, { message: "Request already pending", status: "requested" });

  // A private account gets a request, exactly as /apis/privacy/follow does.
  if (needsFollowApproval(target)) {
    await User.updateOne({ _id: oid(targetId) }, { $addToSet: { followRequests: oid(userId) } });
    await User.updateOne({ _id: oid(userId) }, { $addToSet: { sentFollowRequests: oid(targetId) } });
    return ok(res, { message: "Follow request sent", status: "requested" });
  }

  await Promise.all([
    User.updateOne({ _id: oid(userId) }, { $addToSet: { following: oid(targetId) } }),
    User.updateOne({ _id: oid(targetId) }, { $addToSet: { followers: oid(userId) } }),
  ]);
  await notify({ recipient: targetId, actor: userId, type: "follow" });

  // Following someone who already follows you makes you friends.
  const nowFriends = (target.followers || []).some((f) => String(f) === String(userId))
    ? false
    : await isMutual(userId, targetId);

  ok(res, { message: "Followed", status: "following", isFriend: nowFriends });
});

const isMutual = async (aId, bId) => {
  const a = await User.findById(aId).select("followers following").lean();
  if (!a) return false;
  return (a.followers || []).some((f) => String(f) === String(bId)) &&
         (a.following || []).some((f) => String(f) === String(bId));
};

export const unfollow = wrap(async (req, res) => {
  const userId = actorId(req);
  const targetId = req.body?.targetId || req.params?.userId;
  if (!isId(userId) || !isId(targetId)) return fail(res, 400, "A valid userId and targetId are required");
  if (String(userId) === String(targetId)) return fail(res, 400, "You can't unfollow yourself");

  const target = await User.findById(targetId).select("_id").lean();
  if (!target) return fail(res, 404, "User not found");

  const [a, b] = await Promise.all([
    User.updateOne({ _id: oid(userId) }, { $pull: { following: oid(targetId), sentFollowRequests: oid(targetId) } }),
    User.updateOne({ _id: oid(targetId) }, { $pull: { followers: oid(userId), followRequests: oid(userId) } }),
  ]);

  const changed = (a.modifiedCount || 0) + (b.modifiedCount || 0) > 0;
  ok(res, {
    message: changed ? "Unfollowed" : "You weren't following them",
    status: "not following",
  });
});

/*
  Remove someone who follows you. Distinct from blocking: it severs their side
  only, silently, and leaves them free to follow again.
*/
export const removeFollower = wrap(async (req, res) => {
  const userId = actorId(req);
  const { userId: targetId } = req.params;
  if (!isId(userId) || !isId(targetId)) return fail(res, 400, "A valid userId is required");

  const me = await User.findById(userId).select("followers").lean();
  if (!me) return fail(res, 404, "User not found");
  if (!(me.followers || []).some((f) => String(f) === String(targetId))) {
    return fail(res, 404, "They don't follow you");
  }

  await Promise.all([
    User.updateOne({ _id: oid(userId) }, { $pull: { followers: oid(targetId) } }),
    User.updateOne({ _id: oid(targetId) }, { $pull: { following: oid(userId) } }),
  ]);
  ok(res, { message: "Follower removed" });
});

/* Shared body for the followers / following / friends lists. */
const connectionList = (kind) => wrap(async (req, res) => {
  const viewerId = actorId(req);
  const targetId = req.params.userId || viewerId;
  const { page, limit, skip } = paging(req);
  const search = String(req.query.search || "").trim();

  if (!isId(targetId)) return fail(res, 400, "A valid userId is required");

  const owner = await User.findById(targetId)
    .select("followers following privacy privacySettings blockedUsers accountStatus")
    .lean();
  if (!owner || owner.accountStatus === "deleted") return fail(res, 404, "User not found");

  const self = String(viewerId || "") === String(targetId);
  if (!self && isId(viewerId)) {
    const rel = await relationship(viewerId, owner);
    if (rel === "blocked") return fail(res, 403, "This profile is not available");
    // A private account's connection lists are for its followers only.
    if (needsFollowApproval(owner) && rel !== "follower") {
      return fail(res, 403, "This account's connections are private");
    }
  }

  const ids =
    kind === "friends" ? friendIdsOf(owner)
    : kind === "followers" ? (owner.followers || []).map(String)
    : (owner.following || []).map(String);

  const filter = { _id: { $in: ids.filter(isId).map(oid) }, accountStatus: { $nin: ["deleted"] } };
  if (search) filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [total, rows] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).select(CARD_FIELDS).skip(skip).limit(limit).lean(),
  ]);

  // The viewer's own relationship to each row, for the follow button.
  const viewer = isId(viewerId)
    ? await User.findById(viewerId).select("following sentFollowRequests").lean()
    : null;
  const myFollowing = new Set((viewer?.following || []).map(String));
  const myRequested = new Set((viewer?.sentFollowRequests || []).map(String));
  const ownerFriends = new Set(friendIdsOf(owner));

  ok(res, {
    of: targetId,
    kind,
    page, limit, total,
    pages: Math.ceil(total / limit),
    hasMore: skip + rows.length < total,
    users: rows.map((u) => ({
      _id: u._id,
      name: u.name,
      image: u.image || null,
      bio: u.bio || "",
      verifiedBadge: !!u.verifiedBadge,
      accountType: u.accountType || "personal",
      followers: (u.followers || []).length,
      isSelf: String(u._id) === String(viewerId),
      isFollowing: myFollowing.has(String(u._id)),
      requested: myRequested.has(String(u._id)),
      isFriend: ownerFriends.has(String(u._id)),
      isPrivate: needsFollowApproval(u),
    })),
  });
});

export const followers = connectionList("followers");
export const following = connectionList("following");
export const friends = connectionList("friends");

/* Counts for the profile header, in one call. */
export const connectionCounts = wrap(async (req, res) => {
  const targetId = req.params.userId || actorId(req);
  if (!isId(targetId)) return fail(res, 400, "A valid userId is required");

  const u = await User.findById(targetId).select("followers following").lean();
  if (!u) return fail(res, 404, "User not found");

  ok(res, {
    of: targetId,
    followers: (u.followers || []).length,
    following: (u.following || []).length,
    friends: friendIdsOf(u).length,
  });
});

/*
  Friends in common with another account — the "you both know" line. Computed
  as the intersection of the two friend sets rather than of the follower lists,
  so it means the same thing as the friends list itself.
*/
export const mutualFriends = wrap(async (req, res) => {
  const userId = actorId(req);
  const { userId: otherId } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
  if (!isId(userId) || !isId(otherId)) return fail(res, 400, "A valid userId is required");
  if (String(userId) === String(otherId)) return fail(res, 400, "Pick a different account");

  const [me, other] = await Promise.all([
    User.findById(userId).select("followers following").lean(),
    User.findById(otherId).select("followers following privacy privacySettings blockedUsers accountStatus").lean(),
  ]);
  if (!me) return fail(res, 404, "User not found");
  if (!other || other.accountStatus === "deleted") return fail(res, 404, "User not found");

  const rel = await relationship(userId, other);
  if (rel === "blocked") return fail(res, 403, "This profile is not available");

  const mineSet = new Set(friendIdsOf(me));
  const shared = friendIdsOf(other).filter((id) => mineSet.has(id));

  const rows = await User.find({ _id: { $in: shared.slice(0, limit).filter(isId).map(oid) } })
    .select(CARD_FIELDS)
    .lean();

  ok(res, {
    of: otherId,
    total: shared.length,
    friends: rows.map((u) => ({
      _id: u._id, name: u.name, image: u.image || null,
      verifiedBadge: !!u.verifiedBadge,
    })),
  });
});

/* Relationship between the viewer and one account, for a profile header. */
export const relationshipWith = wrap(async (req, res) => {
  const userId = actorId(req);
  const { userId: otherId } = req.params;
  if (!isId(userId) || !isId(otherId)) return fail(res, 400, "A valid userId is required");

  const [me, other] = await Promise.all([
    User.findById(userId).select("following followers sentFollowRequests").lean(),
    User.findById(otherId).select("followers following privacy privacySettings blockedUsers accountStatus").lean(),
  ]);
  if (!me || !other) return fail(res, 404, "User not found");

  const rel = await relationship(userId, other);
  const iFollow = (me.following || []).some((f) => String(f) === String(otherId));
  const theyFollow = (me.followers || []).some((f) => String(f) === String(otherId));

  ok(res, {
    of: otherId,
    isSelf: String(userId) === String(otherId),
    isFollowing: iFollow,
    followsYou: theyFollow,
    isFriend: iFollow && theyFollow,
    requested: (me.sentFollowRequests || []).some((f) => String(f) === String(otherId)),
    blocked: rel === "blocked",
    isPrivate: needsFollowApproval(other),
  });
});
