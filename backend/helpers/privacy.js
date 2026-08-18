/*
  Privacy + blocking resolution for the Social Media module.

  One place decides "may viewer X see area A of user Y", so profile, feed,
  search, chat and comments all answer the same way.

  Modes:
    public  - everything open except what blocking hides
    private - posts/stories/reels/followers restricted to approved followers
    custom  - each area read from user.privacySettings

  Blocking always wins over every privacy mode, in both directions: if either
  party blocked the other, neither sees the other anywhere in the app.
*/

import mongoose from "mongoose";
import User from "../models/users.js";

export const AUDIENCES = ["everyone", "followers", "closeFriends", "nobody"];

export const AREAS = [
  "posts", "stories", "reels", "followersList", "profilePhoto",
  "bio", "onlineStatus", "messages", "comments", "tagging", "mentions",
];

// What "public" and "private" mean, so the two presets stay in one place.
const PRESETS = {
  public: {
    posts: "everyone", stories: "everyone", reels: "everyone",
    followersList: "everyone", profilePhoto: "everyone", bio: "everyone",
    onlineStatus: "everyone", messages: "everyone", comments: "everyone",
    tagging: "everyone", mentions: "everyone",
    discoverable: true, readReceipts: true,
  },
  private: {
    posts: "followers", stories: "followers", reels: "followers",
    followersList: "followers", profilePhoto: "everyone", bio: "everyone",
    onlineStatus: "followers", messages: "followers", comments: "followers",
    tagging: "followers", mentions: "followers",
    discoverable: true, readReceipts: true,
  },
};

export const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const sameId = (a, b) => String(a) === String(b);
const hasId = (list, id) => (list || []).some((x) => sameId(x, id));

/**
 * Effective settings for a user, whichever mode they are in.
 * Custom mode falls back to the public preset for anything unset.
 */
export function effectiveSettings(user) {
  const mode = user?.privacy || "public";
  if (mode === "custom") {
    const custom = user.privacySettings
      ? (typeof user.privacySettings.toObject === "function"
          ? user.privacySettings.toObject()
          : user.privacySettings)
      : {};
    return { ...PRESETS.public, ...custom };
  }
  return { ...(PRESETS[mode] || PRESETS.public) };
}

/**
 * True when either user has blocked the other.
 * Accepts ids or already-loaded documents to avoid refetching.
 */
export async function isBlockedEither(aId, bId, { aDoc, bDoc } = {}) {
  if (!aId || !bId || sameId(aId, bId)) return false;

  const a = aDoc || (await User.findById(aId).select("blockedUsers").lean());
  if (a && hasId(a.blockedUsers, bId)) return true;

  const b = bDoc || (await User.findById(bId).select("blockedUsers").lean());
  if (b && hasId(b.blockedUsers, aId)) return true;

  return false;
}

/**
 * Every user id the viewer should never see: people they blocked, plus
 * people who blocked them. Feed/search/suggestion queries pass the result
 * straight into a `$nin`.
 */
export async function hiddenUserIds(viewerId) {
  if (!isId(viewerId)) return [];

  const viewer = await User.findById(viewerId).select("blockedUsers").lean();
  const blockedByMe = (viewer?.blockedUsers || []).map(String);

  const blockedMe = await User.find({ blockedUsers: viewerId }).distinct("_id");

  return [...new Set([...blockedByMe, ...blockedMe.map(String)])]
    .map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * Relationship of viewer to target: self / blocked / follower / requested / stranger.
 * Anonymous viewers (no id) are strangers.
 */
export async function relationship(viewerId, target) {
  if (!viewerId) return "stranger";
  if (sameId(viewerId, target._id)) return "self";

  if (await isBlockedEither(viewerId, target._id, { bDoc: target })) return "blocked";
  if (hasId(target.followers, viewerId)) return "follower";
  if (hasId(target.followRequests, viewerId)) return "requested";

  return "stranger";
}

/**
 * Can `viewer` see `area` of `target`?
 * `rel` may be passed in when the caller already computed it.
 */
export async function canView(viewerId, target, area, rel) {
  const r = rel || (await relationship(viewerId, target));
  if (r === "self") return true;
  if (r === "blocked") return false;

  const setting = effectiveSettings(target)[area] || "everyone";

  switch (setting) {
    case "everyone":     return true;
    case "followers":    return r === "follower";
    case "closeFriends": return hasId(target.closeFriends, viewerId);
    case "nobody":       return false;
    default:             return true;
  }
}

/**
 * Resolve every area at once — what a profile screen needs in one call.
 * Returns { relationship, mode, permissions: { posts: true, ... } }.
 */
export async function visibilityFor(viewerId, target) {
  const rel = await relationship(viewerId, target);
  const permissions = {};
  for (const area of AREAS) {
    permissions[area] = await canView(viewerId, target, area, rel);
  }
  return {
    relationship: rel,
    mode: target.privacy || "public",
    discoverable: effectiveSettings(target).discoverable !== false,
    permissions,
  };
}

/**
 * Does following this account need approval first?
 */
export function needsFollowApproval(target) {
  const mode = target?.privacy || "public";
  if (mode === "private") return true;
  if (mode === "custom") {
    // Custom counts as approval-gated when posts are not open to everyone
    return effectiveSettings(target).posts !== "everyone";
  }
  return false;
}

/**
 * Strip fields the viewer is not allowed to see from a profile payload.
 * Mutates nothing — returns a new object.
 */
export function applyProfileMask(profile, permissions) {
  const out = { ...profile };
  if (!permissions.profilePhoto) out.image = null;
  if (!permissions.bio) out.bio = null;
  if (!permissions.onlineStatus) out.onlinestatus = null;
  if (!permissions.followersList) {
    out.followersCount = null;
    out.followingCount = null;
    out.followers = undefined;
    out.following = undefined;
  }
  return out;
}
