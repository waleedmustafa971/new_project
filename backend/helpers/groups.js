/*
  Groups & Community — shared membership, permission and sync logic.

  Everything that more than one endpoint needs lives here so that "can this
  person do this?" has exactly one answer in the codebase. The controller
  reads permissions through `can()` and never re-derives them from role
  strings inline.
*/

import mongoose from "mongoose";
import Group from "../models/socialmediagroup.js";
import GroupMember from "../models/GroupMember.js";

export const isId = (v) => mongoose.Types.ObjectId.isValid(v);
export const oid = (v) => new mongoose.Types.ObjectId(String(v));

/*
  Role rank. Higher outranks lower, and a moderator cannot act on an admin.
  Expressed as numbers because every "may X act on Y?" question in a group
  reduces to comparing two ranks.
*/
export const RANK = { owner: 4, admin: 3, moderator: 2, member: 1 };
const rankOf = (role) => RANK[role] || 0;

/*
  Capability matrix. Read top-down: the first role that holds a capability and
  everyone above it has it too, since capabilities are rank-thresholded.
*/
const MIN_RANK = {
  // group itself
  editGroup: RANK.admin,
  deleteGroup: RANK.owner,
  transferOwnership: RANK.owner,
  editSettings: RANK.admin,

  // rules
  manageRules: RANK.admin,

  // members
  reviewRequests: RANK.moderator,
  removeMember: RANK.moderator,
  banMember: RANK.admin,
  inviteMember: RANK.member,       // narrowed further by settings.membersCanInvite
  assignRole: RANK.admin,

  // posts
  reviewPosts: RANK.moderator,
  removePost: RANK.moderator,
  pinPost: RANK.moderator,

  // reporting
  viewInsights: RANK.moderator,
};

/*
  `membership` is a GroupMember row or null. Anything other than an active
  membership holds no capability at all — a pending or banned row must not
  read as a member.
*/
export const can = (membership, capability, group = null) => {
  if (!membership || membership.status !== "active") return false;
  const need = MIN_RANK[capability];
  if (need === undefined) return false;
  const rank = rankOf(membership.role);
  if (rank < need) return false;

  // Members may only invite when the group allows it; staff always may.
  if (capability === "inviteMember" && rank === RANK.member) {
    return group ? group.settings?.membersCanInvite !== false : false;
  }
  return true;
};

/* Whether `actor` outranks `target` — required to remove, ban or re-role. */
export const outranks = (actor, target) => {
  if (!actor || !target) return false;
  if (String(actor.user) === String(target.user)) return false;
  return rankOf(actor.role) > rankOf(target.role);
};

/* The membership row, or null. Never throws on a malformed id. */
export const membershipOf = async (groupId, userId) => {
  if (!isId(groupId) || !isId(userId)) return null;
  return GroupMember.findOne({ group: oid(groupId), user: oid(userId) }).lean();
};

/* Whether the viewer may read the group's content at all. */
export const canView = (group, membership) => {
  if (!group || group.deletedAt) return false;
  if (group.visibility === "public") return true;
  return !!membership && membership.status === "active";
};

/* Whether the group should even appear in listings and search. */
export const canDiscover = (group, membership) => {
  if (!group || group.deletedAt) return false;
  if (group.visibility === "secret") return !!membership && membership.status === "active";
  return true;
};

/*
  Whether an active member may post, given the group's policy.
  Returns "post" (goes live), "review" (queued) or false (not allowed).
*/
export const postingMode = (group, membership) => {
  if (!membership || membership.status !== "active") return false;
  const policy = group.settings?.postPolicy || "anyone";
  const staff = rankOf(membership.role) >= RANK.moderator;
  if (staff) return "post";               // staff bypass their own queue
  if (policy === "admins") return false;
  if (policy === "approval") return "review";
  return "post";
};

/*
  Recompute the group's counters and legacy arrays from the membership rows.

  The legacy arrays are rebuilt wholesale rather than patched incrementally:
  a $pull/$push pair for every state change is where the two representations
  drift apart, and the rows are already the source of truth. Groups are small
  enough in this product for that to be the cheaper mistake to avoid.
*/
export const syncGroupMembership = async (groupId) => {
  if (!isId(groupId)) return null;
  const gid = oid(groupId);

  const [active, pending] = await Promise.all([
    GroupMember.find({ group: gid, status: "active" }).select("user role").lean(),
    GroupMember.find({ group: gid, status: "pending" }).select("user").lean(),
  ]);

  const members = active.map((m) => m.user);
  const admins = active
    .filter((m) => m.role === "owner" || m.role === "admin")
    .map((m) => m.user);
  const pendingRequests = pending.map((m) => m.user);

  return Group.findByIdAndUpdate(
    gid,
    {
      $set: {
        members,
        admins,
        pendingRequests,
        memberCount: members.length,
        pendingCount: pendingRequests.length,
      },
    },
    { new: true }
  );
};

/* Bump the "something happened here" clock used to sort group lists. */
export const touchGroup = (groupId) =>
  Group.updateOne({ _id: oid(groupId) }, { $set: { lastActivityAt: new Date() } });

/*
  Shape a group for a list or detail response. `membership` decides which
  private fields are included — a non-member never receives the pending queue
  size or the settings block.
*/
export const shapeGroup = (group, membership = null, extras = {}) => {
  const role = membership && membership.status === "active" ? membership.role : null;
  const staff = rankOf(role) >= RANK.moderator;

  const base = {
    _id: group._id,
    name: group.name,
    description: group.description || "",
    logo: group.logo || null,
    coverImage: group.coverImage || null,
    category: group.category || null,
    tags: group.tags || [],
    visibility: group.visibility || (group.isPrivate ? "private" : "public"),
    isPrivate: !!group.isPrivate,
    creator: group.creator,
    memberCount: group.memberCount ?? (group.members || []).length,
    postCount: group.postCount ?? 0,
    rulesCount: (group.rules || []).length,
    createdAt: group.createdAt,
    lastActivityAt: group.lastActivityAt || group.createdAt,

    // Viewer-relative state the join button renders from
    myRole: role,
    myStatus: membership?.status || null,
    isMember: membership?.status === "active",
    canPost: !!postingMode(group, membership),
    canView: canView(group, membership),
    ...extras,
  };

  if (staff) {
    base.pendingCount = group.pendingCount ?? 0;
    base.settings = group.settings || {};
  }
  return base;
};
