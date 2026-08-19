/*
  Privacy Settings — mobile-facing API.
  Sheet row: "Privacy Settings (public, private, custom)" / "Profile Privacy".

  Covers the settings screen, the follow-request queue that a private account
  needs, and a visibility lookup the app calls before rendering someone's profile.
*/

import mongoose from "mongoose";
import User from "../models/users.js";
import Reels from "../models/Reels.js";
import {
  AREAS, AUDIENCES, effectiveSettings, visibilityFor,
  needsFollowApproval, relationship, applyProfileMask, isId,
} from "../helpers/privacy.js";
import {
  canViewPost, ageFrom, meetsAgeGate, MINIMUM_AGE, ADULT_AGE, oid,
} from "../helpers/safety.js";
import { notify } from "../services/notificationService.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message, extra = {}) =>
  res.status(code).json({ success: false, message, ...extra });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[privacy]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// The app may send the acting user as a token, a body field or a query param.
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId;

/* ------------------------------------------------------------------ */
/* settings                                                            */
/* ------------------------------------------------------------------ */

export const getSettings = wrap(async (req, res) => {
  const id = actorId(req);
  if (!isId(id)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(id)
    .select("privacy privacySettings closeFriends followRequests")
    .lean();
  if (!user) return fail(res, 404, "User not found");

  ok(res, {
    privacy: user.privacy || "public",
    // What is actually in force right now, preset or custom
    effective: effectiveSettings(user),
    // The user's saved custom choices, kept even while in public/private mode
    custom: user.privacySettings || {},
    closeFriendsCount: (user.closeFriends || []).length,
    pendingFollowRequests: (user.followRequests || []).length,
    options: { areas: AREAS, audiences: AUDIENCES, modes: ["public", "private", "custom"] },
  });
});

export const updateSettings = wrap(async (req, res) => {
  const id = actorId(req);
  if (!isId(id)) return fail(res, 400, "A valid userId is required");

  const { privacy, settings } = req.body || {};
  const update = { updateby: new Date() };

  if (privacy !== undefined) {
    if (!["public", "private", "custom"].includes(privacy)) {
      return fail(res, 400, "privacy must be public, private or custom");
    }
    update.privacy = privacy;
  }

  // Only write keys we recognise, so a stray field can't widen access
  if (settings && typeof settings === "object") {
    for (const area of AREAS) {
      if (settings[area] === undefined) continue;
      if (!AUDIENCES.includes(settings[area])) {
        return fail(res, 400, `${area} must be one of: ${AUDIENCES.join(", ")}`);
      }
      update[`privacySettings.${area}`] = settings[area];
    }
    if (settings.discoverable !== undefined) {
      update["privacySettings.discoverable"] = !!settings.discoverable;
    }
    if (settings.readReceipts !== undefined) {
      update["privacySettings.readReceipts"] = !!settings.readReceipts;
    }
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true })
    .select("privacy privacySettings")
    .lean();
  if (!user) return fail(res, 404, "User not found");

  ok(res, {
    message: "Privacy settings saved",
    privacy: user.privacy,
    effective: effectiveSettings(user),
    custom: user.privacySettings || {},
  });
});

/* ------------------------------------------------------------------ */
/* visibility lookup                                                   */
/* ------------------------------------------------------------------ */

// What may the viewer see of this profile? Called before rendering someone.
export const getVisibility = wrap(async (req, res) => {
  const viewerId = req.query.viewerId || actorId(req);
  const { targetId } = req.query;
  if (!isId(targetId)) return fail(res, 400, "A valid targetId is required");

  const target = await User.findById(targetId)
    .select("privacy privacySettings followers followRequests closeFriends blockedUsers accountStatus")
    .lean();
  if (!target) return fail(res, 404, "User not found");

  const vis = await visibilityFor(isId(viewerId) ? viewerId : null, target);
  ok(res, { ...vis, needsApproval: needsFollowApproval(target) });
});

// Profile fetch that already has the mask applied — safe to render directly.
export const getMaskedProfile = wrap(async (req, res) => {
  const viewerId = req.query.viewerId || actorId(req);
  const { targetId } = req.query;
  if (!isId(targetId)) return fail(res, 400, "A valid targetId is required");

  const target = await User.findById(targetId)
    .select("-password -otpcode -fcm_token -fcm_tokens")
    .lean();
  if (!target) return fail(res, 404, "User not found");

  const vis = await visibilityFor(isId(viewerId) ? viewerId : null, target);

  if (vis.relationship === "blocked") {
    return fail(res, 403, "This profile is not available");
  }

  const profile = applyProfileMask(
    {
      _id: target._id,
      name: target.name,
      firstname: target.firstname,
      lastname: target.lastname,
      image: target.image,
      bio: target.bio,
      gender: target.gender,
      nationality: target.nationality,
      interest: target.interest,
      onlinestatus: target.onlinestatus,
      verifiedBadge: !!target.verifiedBadge,
      accountType: target.accountType || "personal",
      privacy: target.privacy || "public",
      followersCount: (target.followers || []).length,
      followingCount: (target.following || []).length,
      enteredby: target.enteredby,
    },
    vis.permissions
  );

  ok(res, {
    user: profile,
    visibility: vis,
    needsApproval: needsFollowApproval(target),
  });
});

/* ------------------------------------------------------------------ */
/* follow requests (private accounts)                                  */
/* ------------------------------------------------------------------ */

/*
  Follow entry point that respects privacy. Public accounts follow instantly;
  approval-gated accounts get a pending request instead.
*/
export const requestFollow = wrap(async (req, res) => {
  const followerId = actorId(req);
  const { targetId } = req.body || {};
  if (!isId(followerId) || !isId(targetId)) return fail(res, 400, "Valid userId and targetId are required");
  if (String(followerId) === String(targetId)) return fail(res, 400, "You cannot follow yourself");

  const target = await User.findById(targetId)
    .select("privacy privacySettings followers followRequests blockedUsers")
    .lean();
  if (!target) return fail(res, 404, "User not found");

  const rel = await relationship(followerId, target);
  if (rel === "blocked") return fail(res, 403, "This profile is not available");
  if (rel === "follower") return ok(res, { status: "following", message: "Already following" });
  if (rel === "requested") return ok(res, { status: "requested", message: "Request already pending" });

  if (needsFollowApproval(target)) {
    await User.findByIdAndUpdate(targetId, { $addToSet: { followRequests: followerId } });
    await User.findByIdAndUpdate(followerId, { $addToSet: { sentFollowRequests: targetId } });
    return ok(res, { status: "requested", message: "Follow request sent" });
  }

  await User.findByIdAndUpdate(followerId, { $addToSet: { following: targetId } });
  await User.findByIdAndUpdate(targetId, { $addToSet: { followers: followerId } });
  await notify({ recipient: targetId, actor: followerId, type: "follow" });
  ok(res, { status: "following", message: "Followed successfully" });
});

export const cancelFollowRequest = wrap(async (req, res) => {
  const followerId = actorId(req);
  const { targetId } = req.body || {};
  if (!isId(followerId) || !isId(targetId)) return fail(res, 400, "Valid userId and targetId are required");

  await User.findByIdAndUpdate(targetId, { $pull: { followRequests: followerId } });
  await User.findByIdAndUpdate(followerId, { $pull: { sentFollowRequests: targetId } });
  ok(res, { status: "none", message: "Request cancelled" });
});

export const listFollowRequests = wrap(async (req, res) => {
  const id = actorId(req);
  if (!isId(id)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(id)
    .populate("followRequests", "name image verifiedBadge bio")
    .select("followRequests")
    .lean();
  if (!user) return fail(res, 404, "User not found");

  ok(res, { rows: user.followRequests || [], total: (user.followRequests || []).length });
});

export const listSentRequests = wrap(async (req, res) => {
  const id = actorId(req);
  if (!isId(id)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(id)
    .populate("sentFollowRequests", "name image verifiedBadge")
    .select("sentFollowRequests")
    .lean();
  if (!user) return fail(res, 404, "User not found");

  ok(res, { rows: user.sentFollowRequests || [], total: (user.sentFollowRequests || []).length });
});

export const respondFollowRequest = wrap(async (req, res) => {
  const ownerId = actorId(req);
  const { requesterId, action } = req.body || {};
  if (!isId(ownerId) || !isId(requesterId)) return fail(res, 400, "Valid userId and requesterId are required");
  if (!["accept", "reject"].includes(action)) return fail(res, 400, "action must be accept or reject");

  const owner = await User.findById(ownerId).select("followRequests").lean();
  if (!owner) return fail(res, 404, "User not found");
  if (!(owner.followRequests || []).some((x) => String(x) === String(requesterId))) {
    return fail(res, 404, "No pending request from that user");
  }

  await User.findByIdAndUpdate(ownerId, { $pull: { followRequests: requesterId } });
  await User.findByIdAndUpdate(requesterId, { $pull: { sentFollowRequests: ownerId } });

  if (action === "accept") {
    await User.findByIdAndUpdate(ownerId, { $addToSet: { followers: requesterId } });
    await User.findByIdAndUpdate(requesterId, { $addToSet: { following: ownerId } });
    // The follow only becomes real on approval, so that is when it is recorded.
    await notify({ recipient: ownerId, actor: requesterId, type: "follow" });
  }

  ok(res, { message: action === "accept" ? "Follower approved" : "Request rejected" });
});

/* ------------------------------------------------------------------ */
/* close friends (the allow list custom mode can point at)             */
/* ------------------------------------------------------------------ */

export const listCloseFriends = wrap(async (req, res) => {
  const id = actorId(req);
  if (!isId(id)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(id)
    .populate("closeFriends", "name image verifiedBadge")
    .select("closeFriends")
    .lean();
  if (!user) return fail(res, 404, "User not found");

  ok(res, { rows: user.closeFriends || [], total: (user.closeFriends || []).length });
});

export const updateCloseFriends = wrap(async (req, res) => {
  const id = actorId(req);
  const { targetId, action } = req.body || {};
  if (!isId(id) || !isId(targetId)) return fail(res, 400, "Valid userId and targetId are required");
  if (!["add", "remove"].includes(action)) return fail(res, 400, "action must be add or remove");

  await User.findByIdAndUpdate(
    id,
    action === "add" ? { $addToSet: { closeFriends: targetId } } : { $pull: { closeFriends: targetId } }
  );
  ok(res, { message: action === "add" ? "Added to close friends" : "Removed from close friends" });
});

/* ================================================================== */
/* Post Visibility Controls                                            */
/* ================================================================== */

const POST_AUDIENCES = ["everyone", "followers", "closeFriends", "onlyMe"];

/*
  Set who one post is for.

  This overrides the account-level `privacySettings.posts` rather than combining
  with it — one public announcement from an otherwise followers-only account is
  the case the control exists for, and ANDing the two settings makes that
  impossible to express.

  Changing the audience is retroactive by design: it is the same post, and
  someone who should no longer see it should no longer see it.
*/
export const setPostAudience = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { audience, ageRestricted } = req.body || {};

  if (!isId(userId) || !isId(id)) {
    return fail(res, 400, "Valid userId and post id are required");
  }
  if (audience === undefined && ageRestricted === undefined) {
    return fail(res, 400, "Supply audience and/or ageRestricted");
  }
  if (audience !== undefined && !POST_AUDIENCES.includes(audience)) {
    return fail(res, 422, `audience must be one of: ${POST_AUDIENCES.join(", ")}`);
  }

  // The author on this model is `username`, an ObjectId ref — not `userid`.
  const post = await Reels.findById(id).select("username audience ageRestricted").lean();
  if (!post) return fail(res, 404, "Post not found");
  if (String(post.username) !== String(userId)) {
    return fail(res, 403, "That is not your post");
  }

  const set = {};
  if (audience !== undefined) set.audience = audience;
  if (ageRestricted !== undefined) set.ageRestricted = !!ageRestricted;

  await Reels.updateOne({ _id: id }, { $set: set });
  const fresh = await Reels.findById(id).select("audience ageRestricted").lean();

  ok(res, {
    message: "Visibility updated",
    postId: id,
    audience: fresh.audience,
    ageRestricted: !!fresh.ageRestricted,
  });
});

/*
  Whether a given viewer may see a given post, and why.

  Exposed so the app can ask before rendering rather than each content endpoint
  growing its own copy of the rule — the reason is what lets it show "Followers
  only" rather than a blank card.
*/
export const postVisibility = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "A valid post id is required");

  const post = await Reels.findById(id)
    .select("username audience ageRestricted status").lean();
  if (!post) return fail(res, 404, "Post not found");

  const verdict = await canViewPost(viewerId, post);
  ok(res, {
    postId: id,
    audience: post.audience || "everyone",
    ageRestricted: !!post.ageRestricted,
    ...verdict,
  });
});

/* Every post of the caller's that is not fully public — the "who can see what"
   screen, which is unanswerable if each post has to be opened one at a time. */
export const myRestrictedPosts = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const posts = await Reels.find({
    username: oid(userId),
    $or: [{ audience: { $ne: "everyone" } }, { ageRestricted: true }],
  }).select("videoTitle audience ageRestricted xtime media").sort({ xtime: -1 }).lean();

  ok(res, {
    total: posts.length,
    byAudience: posts.reduce((acc, p) => {
      const key = p.audience || "everyone";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    posts,
  });
});

/* ================================================================== */
/* Age Restrictions                                                    */
/* ================================================================== */

/*
  The viewer's own age standing.

  `dateofbirth` on this model is free text and arrives in several shapes, so an
  unreadable value reports `age: null` rather than guessing. Everything
  downstream treats null as "not old enough", because defaulting the other way
  would let every account that never filled in a birthday through the gate —
  which is precisely what the control is for.
*/
export const ageStatus = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(userId).select("dateofbirth").lean();
  if (!user) return fail(res, 404, "User not found");

  const age = ageFrom(user.dateofbirth);
  ok(res, {
    dateofbirth: user.dateofbirth || null,
    age,
    known: age !== null,
    meetsMinimum: age !== null && age >= MINIMUM_AGE,
    isAdult: age !== null && age >= ADULT_AGE,
    minimumAge: MINIMUM_AGE,
    adultAge: ADULT_AGE,
    canViewRestricted: meetsAgeGate(user),
  });
});

/*
  Set or correct a date of birth.

  Rejects an age below the platform minimum outright, and refuses a birthday in
  the future or absurdly far in the past — all three are the same class of
  mistake and all three produce a nonsense age downstream.

  Deliberately does not delete or suspend an under-age account. That is a
  moderation decision with consequences for someone's data, and it belongs with
  a human in the admin panel rather than as a side effect of a profile edit.
*/
export const setDateOfBirth = wrap(async (req, res) => {
  const userId = actorId(req);
  const { dateofbirth } = req.body || {};
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!dateofbirth) return fail(res, 400, "A date of birth is required");

  const age = ageFrom(dateofbirth);
  if (age === null) {
    return fail(res, 422, "That date of birth could not be read");
  }
  if (age < MINIMUM_AGE) {
    return fail(res, 403, `You must be at least ${MINIMUM_AGE} to use this app`, {
      age, minimumAge: MINIMUM_AGE,
    });
  }

  await User.updateOne({ _id: oid(userId) }, { $set: { dateofbirth: String(dateofbirth) } });
  ok(res, {
    message: "Date of birth saved",
    age,
    isAdult: age >= ADULT_AGE,
  });
});
