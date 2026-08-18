/*
  Privacy Settings — mobile-facing API.
  Sheet row: "Privacy Settings (public, private, custom)" / "Profile Privacy".

  Covers the settings screen, the follow-request queue that a private account
  needs, and a visibility lookup the app calls before rendering someone's profile.
*/

import mongoose from "mongoose";
import User from "../models/users.js";
import {
  AREAS, AUDIENCES, effectiveSettings, visibilityFor,
  needsFollowApproval, relationship, applyProfileMask, isId,
} from "../helpers/privacy.js";
import { notify } from "../services/notificationService.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

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
