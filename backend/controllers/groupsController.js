/*
  Groups & Community — mobile-facing API.

  Covers the whole "Groups & Community" section of the module sheet:
    create public / private groups, posting inside a group, join-request
    review, admins & moderators, group rules, and admin insights.

  Mounted at /apis/groups alongside the older /api/socialgroup CRUD rather than
  replacing it. The legacy membership arrays on the group document are kept in
  sync by helpers/groups.js, so anything still reading /api/socialgroup/list
  sees the same shape it always did.

  Membership lives in its own collection (models/GroupMember.js); this file
  never decides permissions from a role string inline — it asks can().
*/

import Group from "../models/socialmediagroup.js";
import GroupMember from "../models/GroupMember.js";
import Reels from "../models/Reels.js";
import User from "../models/users.js";
import {
  RANK, can, outranks, membershipOf, canView, canDiscover,
  postingMode, syncGroupMembership, touchGroup, shapeGroup, isId, oid,
} from "../helpers/groups.js";
import {
  buildViewerContext, shapeFeedItem, extractHashtags, resolveMentions,
  AUTHOR_FIELDS,
} from "../helpers/feed.js";
import { notify, notifyMany } from "../services/notificationService.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[groups]", req.method, req.originalUrl, err);
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

const sameId = (a, b) => String(a?._id || a) === String(b?._id || b);
const MEMBER_FIELDS = "name image email verifiedBadge accountType";

/*
  Resolve (group, actor, membership) for a request in one place.

  Returns { error } with a ready-to-send code/message when anything is wrong,
  so every endpoint below starts with the same three lines instead of
  re-implementing the not-found / not-a-member / deleted checks.
*/
const context = async (req, { requireMember = false, requireView = true } = {}) => {
  const userId = actorId(req);
  const groupId = req.params.groupId;

  if (!isId(groupId)) return { error: [400, "A valid group id is required"] };
  const group = await Group.findById(groupId).lean();
  if (!group || group.deletedAt) return { error: [404, "Group not found"] };

  const me = isId(userId) ? await membershipOf(groupId, userId) : null;

  // A banned member is told plainly rather than being shown an empty group.
  if (me?.status === "banned") return { error: [403, "You have been removed from this group"] };

  if (requireView && !canView(group, me)) {
    return { error: [403, "This group is private — join to see its content"] };
  }
  if (requireMember && me?.status !== "active") {
    return { error: [403, "Only members can do that"] };
  }
  return { group, me, userId };
};

/* Everyone who should hear about a moderation event in this group. */
const staffIds = async (groupId, exclude = null) => {
  const staff = await GroupMember.find({
    group: oid(groupId),
    status: "active",
    role: { $in: ["owner", "admin", "moderator"] },
  }).select("user").lean();
  return staff
    .map((s) => String(s.user))
    .filter((id) => !exclude || id !== String(exclude));
};

/* ================================================================== */
/* 1. Create public or private groups                                  */
/* ================================================================== */

/*
  Create a group. The creator's ownership row is written in the same call —
  a group with no owner cannot be administered, and having the client follow
  up with a "join as owner" request leaves that window open.
*/
export const createGroup = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const {
    name, description = "", logo, coverImage, category,
    tags = [], visibility = "public", settings = {}, rules = [],
  } = req.body || {};

  if (!String(name || "").trim()) return fail(res, 400, "A group needs a name");
  if (String(name).trim().length > 100) return fail(res, 400, "Group name is too long (100 characters max)");

  const vis = ["public", "private", "secret"].includes(visibility) ? visibility : "public";

  const cleanRules = (Array.isArray(rules) ? rules : [])
    .filter((r) => String(r?.title || r || "").trim())
    .slice(0, 25)
    .map((r, i) => ({
      title: String(r.title || r).trim().slice(0, 120),
      description: String(r.description || "").trim().slice(0, 1000),
      order: i,
    }));

  const now = new Date();
  const group = await Group.create({
    name: String(name).trim(),
    description: String(description).trim(),
    logo, coverImage,
    category: category ? String(category).trim() : undefined,
    tags: (Array.isArray(tags) ? tags : [])
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10),
    visibility: vis,
    // Kept in step with `visibility` so legacy readers of `isPrivate` stay right.
    isPrivate: vis !== "public",
    creator: oid(userId),
    settings: {
      postPolicy: ["anyone", "approval", "admins"].includes(settings.postPolicy) ? settings.postPolicy : "anyone",
      // A private group always reviews joins; a public one may opt in.
      approveMembers: vis === "public" ? !!settings.approveMembers : true,
      membersCanInvite: settings.membersCanInvite !== false,
      requireRulesAccept: !!settings.requireRulesAccept,
      joinQuestion: settings.joinQuestion ? String(settings.joinQuestion).trim().slice(0, 300) : undefined,
    },
    rules: cleanRules,
    rulesVersion: cleanRules.length ? 1 : 0,
    createdAt: now,
    lastActivityAt: now,
  });

  await GroupMember.create({
    group: group._id,
    user: oid(userId),
    role: "owner",
    status: "active",
    joinedAt: now,
    rulesAcceptedVersion: group.rulesVersion,
    rulesAcceptedAt: cleanRules.length ? now : null,
  });
  await syncGroupMembership(group._id);

  const fresh = await Group.findById(group._id).lean();
  const me = await membershipOf(group._id, userId);
  ok(res, { message: "Group created", group: shapeGroup(fresh, me) });
});

/* Discovery list. Secret groups are absent unless the viewer is in them. */
export const listGroups = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  const { search = "", category, tag, sort = "active" } = req.query;

  const myGroupIds = isId(userId)
    ? (await GroupMember.find({ user: oid(userId), status: "active" }).select("group").lean())
        .map((m) => m.group)
    : [];

  const filter = {
    deletedAt: null,
    // Secret groups are invisible in discovery unless you are already inside.
    $or: [{ visibility: { $in: ["public", "private"] } }, { _id: { $in: myGroupIds } }],
  };
  if (search) filter.name = { $regex: String(search).trim(), $options: "i" };
  if (category) filter.category = category;
  if (tag) filter.tags = String(tag).toLowerCase();

  const sortBy = sort === "members" ? { memberCount: -1 }
    : sort === "new" ? { createdAt: -1 }
    : { lastActivityAt: -1 };

  const [total, groups] = await Promise.all([
    Group.countDocuments(filter),
    Group.find(filter).sort(sortBy).skip(skip).limit(limit).lean(),
  ]);

  // One query for the viewer's membership in the whole page, not one per row.
  const mine = isId(userId)
    ? await GroupMember.find({ group: { $in: groups.map((g) => g._id) }, user: oid(userId) }).lean()
    : [];
  const byGroup = Object.fromEntries(mine.map((m) => [String(m.group), m]));

  ok(res, {
    page, limit, total, pages: Math.ceil(total / limit),
    groups: groups.map((g) => shapeGroup(g, byGroup[String(g._id)] || null)),
  });
});

/* Groups the viewer belongs to, plus anything awaiting them. */
export const myGroups = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  const status = req.query.status || "active"; // active | pending | invited

  const rows = await GroupMember.find({ user: oid(userId), status })
    .sort({ joinedAt: -1, requestedAt: -1 })
    .lean();

  const groups = await Group.find({
    _id: { $in: rows.map((r) => r.group) },
    deletedAt: null,
  }).lean();
  const byId = Object.fromEntries(groups.map((g) => [String(g._id), g]));

  ok(res, {
    groups: rows
      .filter((r) => byId[String(r.group)])
      .map((r) => shapeGroup(byId[String(r.group)], r)),
  });
});

export const getGroup = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireView: false });
  if (error) return fail(res, ...error);

  if (!canDiscover(group, me)) return fail(res, 404, "Group not found");

  const creator = await User.findById(group.creator).select(MEMBER_FIELDS).lean();
  const preview = await GroupMember.find({ group: group._id, status: "active" })
    .sort({ role: 1, joinedAt: 1 })
    .limit(8)
    .populate("user", MEMBER_FIELDS)
    .lean();

  ok(res, {
    group: shapeGroup(group, me, {
      creatorInfo: creator || null,
      rules: canView(group, me) ? (group.rules || []).sort((a, b) => a.order - b.order) : [],
      rulesVersion: group.rulesVersion || 0,
      // Prompts the rules sheet again after a group rewrites its rule book.
      mustAcceptRules:
        !!me && me.status === "active" &&
        group.settings?.requireRulesAccept === true &&
        (me.rulesAcceptedVersion ?? -1) < (group.rulesVersion || 0),
      memberPreview: preview.map((m) => ({ ...m.user, role: m.role })),
    }),
  });
});

export const updateGroup = wrap(async (req, res) => {
  const { error, group, me } = await context(req);
  if (error) return fail(res, ...error);
  if (!can(me, "editGroup", group)) return fail(res, 403, "Only group admins can edit the group");

  const { name, description, logo, coverImage, category, tags, visibility } = req.body || {};
  const patch = {};

  if (name !== undefined) {
    if (!String(name).trim()) return fail(res, 400, "A group needs a name");
    patch.name = String(name).trim().slice(0, 100);
  }
  if (description !== undefined) patch.description = String(description).trim();
  if (logo !== undefined) patch.logo = logo;
  if (coverImage !== undefined) patch.coverImage = coverImage;
  if (category !== undefined) patch.category = category ? String(category).trim() : null;
  if (Array.isArray(tags)) {
    patch.tags = tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 10);
  }
  if (visibility !== undefined) {
    if (!["public", "private", "secret"].includes(visibility)) {
      return fail(res, 400, "visibility must be public, private or secret");
    }
    patch.visibility = visibility;
    patch.isPrivate = visibility !== "public";
    // Going private retroactively means joins must be reviewed from now on.
    if (visibility !== "public") patch["settings.approveMembers"] = true;
  }

  const updated = await Group.findByIdAndUpdate(group._id, { $set: patch }, { new: true }).lean();
  ok(res, { message: "Group updated", group: shapeGroup(updated, me) });
});

export const updateSettings = wrap(async (req, res) => {
  const { error, group, me } = await context(req);
  if (error) return fail(res, ...error);
  if (!can(me, "editSettings", group)) return fail(res, 403, "Only group admins can change settings");

  const s = req.body || {};
  const patch = {};

  if (s.postPolicy !== undefined) {
    if (!["anyone", "approval", "admins"].includes(s.postPolicy)) {
      return fail(res, 400, "postPolicy must be anyone, approval or admins");
    }
    patch["settings.postPolicy"] = s.postPolicy;
  }
  if (s.approveMembers !== undefined) {
    // A private group cannot turn review off — that is what private means here.
    if (group.visibility !== "public" && !s.approveMembers) {
      return fail(res, 400, "A private group always reviews join requests");
    }
    patch["settings.approveMembers"] = !!s.approveMembers;
  }
  if (s.membersCanInvite !== undefined) patch["settings.membersCanInvite"] = !!s.membersCanInvite;
  if (s.requireRulesAccept !== undefined) patch["settings.requireRulesAccept"] = !!s.requireRulesAccept;
  if (s.joinQuestion !== undefined) {
    patch["settings.joinQuestion"] = s.joinQuestion ? String(s.joinQuestion).trim().slice(0, 300) : null;
  }

  const updated = await Group.findByIdAndUpdate(group._id, { $set: patch }, { new: true }).lean();
  ok(res, { message: "Settings updated", settings: updated.settings });
});

/*
  Soft delete, matching how posts are removed elsewhere in the module. Group
  posts are hidden at the same time so a deleted group cannot leave its content
  reachable through a post id someone already holds.
*/
export const deleteGroup = wrap(async (req, res) => {
  const { error, group, me } = await context(req);
  if (error) return fail(res, ...error);
  if (!can(me, "deleteGroup", group)) return fail(res, 403, "Only the group owner can delete it");

  const now = new Date();
  await Group.updateOne({ _id: group._id }, { $set: { deletedAt: now } });
  await Reels.updateMany({ group: group._id }, { $set: { status: "hidden" } });

  ok(res, { message: "Group deleted", groupId: group._id });
});

export const restoreGroup = wrap(async (req, res) => {
  const userId = actorId(req);
  const { groupId } = req.params;
  if (!isId(groupId) || !isId(userId)) return fail(res, 400, "Valid group id and userId are required");

  const group = await Group.findById(groupId).lean();
  if (!group) return fail(res, 404, "Group not found");
  if (!group.deletedAt) return fail(res, 400, "That group isn't deleted");
  if (!sameId(group.creator, userId)) return fail(res, 403, "Only the group owner can restore it");

  await Group.updateOne({ _id: group._id }, { $set: { deletedAt: null } });
  await Reels.updateMany({ group: group._id, status: "hidden" }, { $set: { status: "active" } });
  ok(res, { message: "Group restored", groupId: group._id });
});

/* ================================================================== */
/* 2. Group rules                                                      */
/* ================================================================== */

/* Bumping the version is what makes "who accepted the current rules" answerable. */
const bumpRules = (groupId, rules) =>
  Group.findByIdAndUpdate(
    groupId,
    { $set: { rules }, $inc: { rulesVersion: 1 } },
    { new: true }
  ).lean();

export const listRules = wrap(async (req, res) => {
  const { error, group, me } = await context(req);
  if (error) return fail(res, ...error);

  ok(res, {
    rules: (group.rules || []).sort((a, b) => a.order - b.order),
    version: group.rulesVersion || 0,
    requireAccept: group.settings?.requireRulesAccept === true,
    accepted: (me?.rulesAcceptedVersion ?? -1) >= (group.rulesVersion || 0),
    acceptedAt: me?.rulesAcceptedAt || null,
  });
});

export const addRule = wrap(async (req, res) => {
  const { error, group, me } = await context(req);
  if (error) return fail(res, ...error);
  if (!can(me, "manageRules", group)) return fail(res, 403, "Only group admins can manage rules");

  const { title, description = "" } = req.body || {};
  if (!String(title || "").trim()) return fail(res, 400, "A rule needs a title");
  if ((group.rules || []).length >= 25) return fail(res, 400, "A group can have at most 25 rules");

  const rules = [...(group.rules || []), {
    title: String(title).trim().slice(0, 120),
    description: String(description).trim().slice(0, 1000),
    order: (group.rules || []).length,
    createdAt: new Date(),
  }];

  const updated = await bumpRules(group._id, rules);
  ok(res, { message: "Rule added", rules: updated.rules, version: updated.rulesVersion });
});

export const updateRule = wrap(async (req, res) => {
  const { error, group, me } = await context(req);
  if (error) return fail(res, ...error);
  if (!can(me, "manageRules", group)) return fail(res, 403, "Only group admins can manage rules");

  const { ruleId } = req.params;
  const rules = [...(group.rules || [])];
  const idx = rules.findIndex((r) => String(r._id) === String(ruleId));
  if (idx === -1) return fail(res, 404, "Rule not found");

  const { title, description } = req.body || {};
  if (title !== undefined) {
    if (!String(title).trim()) return fail(res, 400, "A rule needs a title");
    rules[idx].title = String(title).trim().slice(0, 120);
  }
  if (description !== undefined) rules[idx].description = String(description).trim().slice(0, 1000);

  const updated = await bumpRules(group._id, rules);
  ok(res, { message: "Rule updated", rules: updated.rules, version: updated.rulesVersion });
});

export const deleteRule = wrap(async (req, res) => {
  const { error, group, me } = await context(req);
  if (error) return fail(res, ...error);
  if (!can(me, "manageRules", group)) return fail(res, 403, "Only group admins can manage rules");

  const { ruleId } = req.params;
  const rules = (group.rules || []).filter((r) => String(r._id) !== String(ruleId));
  if (rules.length === (group.rules || []).length) return fail(res, 404, "Rule not found");

  // Re-number so `order` stays a dense 0..n-1 sequence after a removal.
  rules.sort((a, b) => a.order - b.order).forEach((r, i) => { r.order = i; });

  const updated = await bumpRules(group._id, rules);
  ok(res, { message: "Rule deleted", rules: updated.rules, version: updated.rulesVersion });
});

/* Replace the whole rule book — used by the drag-to-reorder editor. */
export const reorderRules = wrap(async (req, res) => {
  const { error, group, me } = await context(req);
  if (error) return fail(res, ...error);
  if (!can(me, "manageRules", group)) return fail(res, 403, "Only group admins can manage rules");

  const { order } = req.body || {};
  if (!Array.isArray(order) || !order.length) return fail(res, 400, "order must be a list of rule ids");

  const existing = group.rules || [];
  const byId = Object.fromEntries(existing.map((r) => [String(r._id), r]));
  if (order.some((id) => !byId[String(id)])) return fail(res, 400, "order lists a rule that isn't in this group");
  if (order.length !== existing.length) return fail(res, 400, "order must list every rule exactly once");

  const rules = order.map((id, i) => ({ ...byId[String(id)], order: i }));
  const updated = await bumpRules(group._id, rules);
  ok(res, { message: "Rules reordered", rules: updated.rules, version: updated.rulesVersion });
});

export const acceptRules = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);

  await GroupMember.updateOne(
    { _id: me._id },
    { $set: { rulesAcceptedVersion: group.rulesVersion || 0, rulesAcceptedAt: new Date() } }
  );
  ok(res, { message: "Rules accepted", version: group.rulesVersion || 0 });
});

/* ================================================================== */
/* 3. Join, leave, and approve / reject member requests                */
/* ================================================================== */

/*
  Ask to join, or join outright.

  One row per person per group means every path here is idempotent: asking
  twice updates the same pending row instead of queueing two requests, and
  re-joining a group you left reuses the row that already carries your history.
*/
export const joinGroup = wrap(async (req, res) => {
  const { error, group, me: existing, userId } = await context(req, { requireView: false });
  if (error) return fail(res, ...error);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  // A secret group cannot be joined by anyone who was never invited into it.
  if (!canDiscover(group, existing)) return fail(res, 404, "Group not found");

  if (existing?.status === "active") return fail(res, 409, "You're already a member");
  if (existing?.status === "pending") {
    return ok(res, { message: "Your request is already awaiting review", status: "pending" });
  }

  const now = new Date();
  const needsReview = group.settings?.approveMembers === true || group.visibility !== "public";
  const note = String(req.body?.note || "").trim().slice(0, 500);

  // An invited user accepting their invitation skips review — an admin already
  // decided they belong here.
  const invited = existing?.status === "invited";
  const status = invited || !needsReview ? "active" : "pending";

  const doc = await GroupMember.findOneAndUpdate(
    { group: group._id, user: oid(userId) },
    {
      $set: {
        status,
        role: "member",
        requestNote: note || undefined,
        requestedAt: now,
        joinedAt: status === "active" ? now : null,
        leftAt: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        ...(status === "active" && !group.settings?.requireRulesAccept
          ? { rulesAcceptedVersion: group.rulesVersion || 0, rulesAcceptedAt: now }
          : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await syncGroupMembership(group._id);
  if (status === "active") await touchGroup(group._id);

  if (status === "pending") {
    await notifyMany(await staffIds(group._id, userId), {
      actor: userId, type: "group_request", group: group._id, preview: group.name,
    });
  }

  ok(res, {
    message: status === "active" ? "You've joined the group" : "Request sent for review",
    status,
    mustAcceptRules: status === "active" && group.settings?.requireRulesAccept === true,
    membership: doc,
  });
});

export const leaveGroup = wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireView: false });
  if (error) return fail(res, ...error);
  if (!me || me.status !== "active") return fail(res, 400, "You're not a member of this group");

  /*
    The owner cannot simply walk out — a group with no owner has nobody who can
    delete it or promote a replacement. Transfer first, or delete the group.
  */
  if (me.role === "owner") {
    return fail(res, 400, "Transfer ownership before leaving, or delete the group");
  }

  await GroupMember.updateOne(
    { _id: me._id },
    { $set: { status: "left", role: "member", leftAt: new Date() } }
  );
  await syncGroupMembership(group._id);
  ok(res, { message: "You've left the group" });
});

export const listRequests = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "reviewRequests", group)) return fail(res, 403, "Only group moderators can review requests");

  const { page, limit, skip } = paging(req);
  const filter = { group: group._id, status: "pending" };

  const [total, rows] = await Promise.all([
    GroupMember.countDocuments(filter),
    GroupMember.find(filter)
      .sort({ requestedAt: 1 })   // oldest first: a queue, not a stack
      .skip(skip).limit(limit)
      .populate("user", MEMBER_FIELDS)
      .lean(),
  ]);

  ok(res, {
    page, limit, total, pages: Math.ceil(total / limit),
    requests: rows.map((r) => ({
      _id: r._id,
      user: r.user,
      note: r.requestNote || "",
      requestedAt: r.requestedAt,
    })),
  });
});

/*
  Approve or reject in one handler — they differ only in the resulting status
  and who gets told, and splitting them duplicates every guard above.
*/
const reviewRequest = (decision) => wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "reviewRequests", group)) return fail(res, 403, "Only group moderators can review requests");

  const target = req.params.userId;
  if (!isId(target)) return fail(res, 400, "A valid userId is required");

  const row = await GroupMember.findOne({ group: group._id, user: oid(target) });
  if (!row) return fail(res, 404, "No request from that user");
  // Idempotent: reviewing an already-reviewed request reports the outcome
  // rather than flipping a member back into the queue.
  if (row.status !== "pending") {
    return ok(res, { message: `That request was already ${row.status}`, status: row.status });
  }

  const now = new Date();
  row.status = decision === "approve" ? "active" : "rejected";
  row.reviewedBy = oid(userId);
  row.reviewedAt = now;
  row.reviewNote = String(req.body?.note || "").trim().slice(0, 500) || undefined;
  if (decision === "approve") {
    row.joinedAt = now;
    if (group.settings?.requireRulesAccept !== true) {
      row.rulesAcceptedVersion = group.rulesVersion || 0;
      row.rulesAcceptedAt = now;
    }
  }
  await row.save();
  await syncGroupMembership(group._id);

  if (decision === "approve") {
    await touchGroup(group._id);
    await notify({
      recipient: target, actor: userId, type: "group_approved",
      group: group._id, preview: group.name,
    });
  }

  ok(res, {
    message: decision === "approve" ? "Request approved" : "Request rejected",
    status: row.status,
  });
});

export const approveRequest = reviewRequest("approve");
export const rejectRequest = reviewRequest("reject");

export const inviteMembers = wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "inviteMember", group)) return fail(res, 403, "This group doesn't allow member invitations");

  // `userIds` only, for the reason spelled out on transferOwnership below: a
  // bare `userId` in the body is the caller, never the target.
  const ids = (Array.isArray(req.body?.userIds) ? req.body.userIds : [])
    .filter(isId)
    .map(String)
    .filter((id) => id !== String(userId));   // inviting yourself is a no-op
  if (!ids.length) return fail(res, 400, "userIds is required");
  if (ids.length > 50) return fail(res, 400, "At most 50 invitations at a time");

  const existing = await GroupMember.find({ group: group._id, user: { $in: ids.map(oid) } }).lean();
  const byUser = Object.fromEntries(existing.map((e) => [String(e.user), e]));

  const invited = [];
  const skipped = [];
  const now = new Date();

  for (const id of ids) {
    const row = byUser[id];
    // Someone already in, already asked, or barred is not re-invited — an
    // invitation must never quietly overwrite a ban.
    if (row && ["active", "banned", "pending"].includes(row.status)) {
      skipped.push({ userId: id, reason: row.status });
      continue;
    }
    await GroupMember.findOneAndUpdate(
      { group: group._id, user: oid(id) },
      {
        $set: {
          status: "invited", role: "member",
          invitedBy: oid(userId), requestedAt: now,
          joinedAt: null, leftAt: null,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    invited.push(id);
  }

  await syncGroupMembership(group._id);
  if (invited.length) {
    await notifyMany(invited, {
      actor: userId, type: "group_invite", group: group._id, preview: group.name,
    });
  }

  ok(res, { message: `${invited.length} invited`, invited, skipped });
});

export const respondToInvite = wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireView: false });
  if (error) return fail(res, ...error);
  if (!me || me.status !== "invited") return fail(res, 404, "You have no invitation to this group");

  const accept = req.body?.accept !== false;
  const now = new Date();

  await GroupMember.updateOne(
    { _id: me._id },
    accept
      ? {
          $set: {
            status: "active", joinedAt: now,
            ...(group.settings?.requireRulesAccept
              ? {}
              : { rulesAcceptedVersion: group.rulesVersion || 0, rulesAcceptedAt: now }),
          },
        }
      : { $set: { status: "rejected", reviewedAt: now } }
  );
  await syncGroupMembership(group._id);
  if (accept) await touchGroup(group._id);

  ok(res, {
    message: accept ? "Invitation accepted" : "Invitation declined",
    status: accept ? "active" : "rejected",
    mustAcceptRules: accept && group.settings?.requireRulesAccept === true,
  });
});

/* ================================================================== */
/* 4. Admins & moderators                                              */
/* ================================================================== */

export const listMembers = wrap(async (req, res) => {
  const { error, group, me } = await context(req);
  if (error) return fail(res, ...error);

  const { page, limit, skip } = paging(req);
  const { role, search = "" } = req.query;

  const filter = { group: group._id, status: "active" };
  if (role && RANK[role]) filter.role = role;

  if (search) {
    const users = await User.find({ name: { $regex: String(search).trim(), $options: "i" } })
      .select("_id").limit(200).lean();
    filter.user = { $in: users.map((u) => u._id) };
  }

  const [total, rows] = await Promise.all([
    GroupMember.countDocuments(filter),
    GroupMember.find(filter)
      // Staff first, then longest-standing members
      .sort({ role: 1, joinedAt: 1 })
      .skip(skip).limit(limit)
      .populate("user", MEMBER_FIELDS)
      .lean(),
  ]);

  const staff = RANK[me?.role] >= RANK.moderator;

  ok(res, {
    page, limit, total, pages: Math.ceil(total / limit),
    members: rows.map((r) => ({
      _id: r._id,
      user: r.user,
      role: r.role,
      joinedAt: r.joinedAt,
      // Contribution counts are a moderation tool, not a public scoreboard.
      ...(staff ? { postCount: r.postCount, commentCount: r.commentCount, lastActiveAt: r.lastActiveAt } : {}),
    })),
  });
});

/*
  Promote or demote.

  Two rules make this safe: you can only act on someone you outrank, and you
  can only grant a role below your own. Without the second, an admin could
  make someone else an owner and lose the group.
*/
export const setRole = wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "assignRole", group)) return fail(res, 403, "Only group admins can change roles");

  const target = req.params.userId;
  const { role } = req.body || {};
  if (!isId(target)) return fail(res, 400, "A valid userId is required");
  if (!["admin", "moderator", "member"].includes(role)) {
    return fail(res, 400, "role must be admin, moderator or member");
  }

  const row = await GroupMember.findOne({ group: group._id, user: oid(target) });
  if (!row || row.status !== "active") return fail(res, 404, "That user isn't a member of this group");
  if (String(target) === String(userId)) return fail(res, 400, "You can't change your own role");
  if (!outranks(me, row)) return fail(res, 403, "You can't change the role of someone at or above your level");
  if (RANK[role] >= RANK[me.role]) return fail(res, 403, "You can't grant a role at or above your own");

  const previous = row.role;
  if (previous === role) return ok(res, { message: "No change", role });

  row.role = role;
  await row.save();
  await syncGroupMembership(group._id);

  await notify({
    recipient: target, actor: userId, type: "group_role", group: group._id,
    preview: role === "member"
      ? `You're now a member of ${group.name}`
      : `You're now ${role === "admin" ? "an admin" : "a moderator"} of ${group.name}`,
  });

  ok(res, { message: `Role changed to ${role}`, previous, role });
});

export const removeMember = wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);

  const target = req.params.userId;
  if (!isId(target)) return fail(res, 400, "A valid userId is required");
  if (String(target) === String(userId)) return fail(res, 400, "Use leave to remove yourself");

  const ban = req.body?.ban === true;
  if (!can(me, ban ? "banMember" : "removeMember", group)) {
    return fail(res, 403, ban ? "Only group admins can ban members" : "Only group moderators can remove members");
  }

  const row = await GroupMember.findOne({ group: group._id, user: oid(target) });
  if (!row || !["active", "pending", "invited"].includes(row.status)) {
    return fail(res, 404, "That user isn't a member of this group");
  }
  if (!outranks(me, row)) return fail(res, 403, "You can't remove someone at or above your level");

  row.status = ban ? "banned" : "left";
  row.role = "member";
  row.leftAt = new Date();
  row.reviewedBy = oid(userId);
  row.reviewedAt = new Date();
  row.reviewNote = String(req.body?.note || "").trim().slice(0, 500) || undefined;
  await row.save();
  await syncGroupMembership(group._id);

  // A ban also pulls their posts from the group feed; a plain removal does not,
  // because leaving a group is not a judgement on what you wrote in it.
  let hiddenPosts = 0;
  if (ban && req.body?.removePosts === true) {
    const r = await Reels.updateMany(
      { group: group._id, username: oid(target) },
      { $set: { groupStatus: "rejected", groupReviewedBy: oid(userId), groupReviewedAt: new Date() } }
    );
    hiddenPosts = r.modifiedCount || 0;
  }

  ok(res, { message: ban ? "Member banned" : "Member removed", hiddenPosts });
});

export const unbanMember = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "banMember", group)) return fail(res, 403, "Only group admins can lift a ban");

  const target = req.params.userId;
  if (!isId(target)) return fail(res, 400, "A valid userId is required");

  const row = await GroupMember.findOne({ group: group._id, user: oid(target) });
  if (!row || row.status !== "banned") return fail(res, 404, "That user isn't banned");

  // Lifting a ban restores the right to ask, not membership itself.
  row.status = "left";
  row.reviewNote = undefined;
  await row.save();
  await syncGroupMembership(group._id);

  ok(res, { message: "Ban lifted — they can request to join again" });
});

export const listBanned = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "banMember", group)) return fail(res, 403, "Only group admins can see the ban list");

  const rows = await GroupMember.find({ group: group._id, status: "banned" })
    .sort({ leftAt: -1 })
    .populate("user", MEMBER_FIELDS)
    .populate("reviewedBy", "name image")
    .lean();

  ok(res, {
    banned: rows.map((r) => ({
      user: r.user, bannedAt: r.leftAt, bannedBy: r.reviewedBy, reason: r.reviewNote || "",
    })),
  });
});

/*
  Hand the group over. The outgoing owner stays as an admin rather than being
  dropped — losing your own group entirely because you handed over the keys is
  never what was meant.
*/
export const transferOwnership = wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "transferOwnership", group)) return fail(res, 403, "Only the group owner can transfer ownership");

  /*
    Named `newOwnerId`, not `userId`: actorId() reads `userId` from the body, so
    a target under that name is indistinguishable from the caller — the transfer
    would always resolve to "you already own this group".
  */
  const target = req.body?.newOwnerId || req.params.userId;
  if (!isId(target)) return fail(res, 400, "newOwnerId is required");
  if (String(target) === String(userId)) return fail(res, 400, "You already own this group");

  const row = await GroupMember.findOne({ group: group._id, user: oid(target) });
  if (!row || row.status !== "active") return fail(res, 404, "That user isn't a member of this group");

  row.role = "owner";
  await row.save();
  await GroupMember.updateOne({ _id: me._id }, { $set: { role: "admin" } });
  await Group.updateOne({ _id: group._id }, { $set: { creator: oid(target) } });
  await syncGroupMembership(group._id);

  await notify({
    recipient: target, actor: userId, type: "group_role", group: group._id,
    preview: `You're now the owner of ${group.name}`,
  });

  ok(res, { message: "Ownership transferred", newOwner: target });
});

/* ================================================================== */
/* 5. Post inside a group                                              */
/* ================================================================== */

/*
  Create a post inside the group.

  Deliberately narrower than feedController.createPost: a group post carries a
  caption and media, and skips the timeline-only machinery (stories, check-ins,
  cross-posting). Hashtag counts are not touched either — a private group must
  not be able to push a tag up the public trending board.
*/
export const createGroupPost = wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);

  const mode = postingMode(group, me);
  if (!mode) return fail(res, 403, "Only admins can post in this group");

  /*
    The rules gate applies to members, not to the people who write the rules:
    editing a rule bumps rulesVersion past the editor's own acceptance, which
    would lock an admin out of posting in their own group.
  */
  if (group.settings?.requireRulesAccept === true &&
      RANK[me.role] < RANK.moderator &&
      (me.rulesAcceptedVersion ?? -1) < (group.rulesVersion || 0)) {
    return fail(res, 403, "Accept the group rules before posting");
  }

  const { caption = "", media = [], poll, posttype = "Post", posttypechild } = req.body || {};

  if (!String(caption).trim() && !(media || []).length && !poll) {
    return fail(res, 400, "A post needs a caption, media or a poll");
  }
  if ((media || []).length > 10) return fail(res, 400, "A carousel can hold at most 10 items");

  const cleanMedia = (media || []).map((m, i) => ({
    url: m.url,
    type: m.type || (/\.(mp4|mov|webm|m3u8)/i.test(m.url || "") ? "video" : "image"),
    thumbnail: m.thumbnail,
    width: m.width, height: m.height, duration: m.duration,
    altText: m.altText,
    order: m.order !== undefined ? m.order : i,
  })).sort((a, b) => a.order - b.order);
  if (cleanMedia.some((m) => !m.url)) return fail(res, 400, "Every media item needs a url");

  let cleanPoll;
  if (poll) {
    const options = (poll.options || []).filter((o) => String(o.text || o).trim());
    if (!poll.question || options.length < 2) return fail(res, 400, "A poll needs a question and at least 2 options");
    if (options.length > 6) return fail(res, 400, "A poll can have at most 6 options");
    cleanPoll = {
      question: String(poll.question).trim(),
      multiple: !!poll.multiple,
      endsAt: poll.endsAt ? new Date(poll.endsAt) : undefined,
      closed: false,
      options: options.map((o, i) => ({ id: String(o.id || `opt${i + 1}`), text: String(o.text || o).trim(), votes: [] })),
    };
  }

  const now = new Date();
  const groupStatus = mode === "review" ? "pending" : "approved";

  const doc = await Reels.create({
    videoUrl: cleanMedia[0] ? { url: cleanMedia[0].url, type: cleanMedia[0].type } : { url: "", type: "text" },
    videoTitle: caption,
    posttype: String(posttype),
    posttypechild,
    username: oid(userId),
    status: "active",
    status_draft_publish: "Publish",
    media: cleanMedia,
    poll: cleanPoll,
    hashtags: extractHashtags(caption),
    // Mentions still resolve so members can be @'d inside the group, but the
    // notification only fires once the post is actually visible.
    mentions: await resolveMentions(caption),
    group: group._id,
    groupStatus,
    xtime: now,
  });

  if (groupStatus === "approved") {
    await Group.updateOne({ _id: group._id }, { $inc: { postCount: 1 }, $set: { lastActivityAt: now } });
    await GroupMember.updateOne({ _id: me._id }, { $inc: { postCount: 1 }, $set: { lastActiveAt: now } });
    if (doc.mentions?.length) {
      await notifyMany(doc.mentions, {
        actor: userId, type: "mention_post", post: doc._id, group: group._id, preview: caption,
      });
    }
  } else {
    await notifyMany(await staffIds(group._id, userId), {
      actor: userId, type: "group_post", group: group._id,
      preview: `New post awaiting review in ${group.name}`,
    });
  }

  const full = await Reels.findById(doc._id).populate("username", AUTHOR_FIELDS).lean();
  const ctx = await buildViewerContext(userId);

  ok(res, {
    message: groupStatus === "pending" ? "Post submitted for review" : "Posted to the group",
    status: groupStatus,
    item: shapeFeedItem(full, ctx, { group: group._id, groupStatus }),
  });
});

export const groupFeed = wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req);
  if (error) return fail(res, ...error);

  const { page, limit, skip } = paging(req, 10);
  const ctx = await buildViewerContext(userId);

  const match = {
    group: group._id,
    groupStatus: "approved",
    status: { $nin: ["hidden", "deleted"] },
    status_draft_publish: { $ne: "Draft" },
  };
  // Blocked authors stay hidden inside a group too.
  if (ctx.hidden.length) match.username = { $nin: ctx.hidden.map(oid) };

  const [total, docs] = await Promise.all([
    Reels.countDocuments(match),
    Reels.find(match)
      // Pinned first, then newest. One sort, so a pinned post can't be paged past.
      .sort({ groupPinned: -1, xtime: -1 })
      .skip(skip).limit(limit)
      .populate("username", AUTHOR_FIELDS)
      .lean(),
  ]);

  // Which of these authors are still in the group, so the feed can badge staff
  const authorIds = [...new Set(docs.map((d) => String(d.username?._id || d.username)))];
  const roles = await GroupMember.find({
    group: group._id, user: { $in: authorIds.map(oid) }, status: "active",
  }).select("user role").lean();
  const roleOf = Object.fromEntries(roles.map((r) => [String(r.user), r.role]));

  ok(res, {
    page, limit, total, pages: Math.ceil(total / limit),
    canPost: !!postingMode(group, me),
    items: docs.map((d) => shapeFeedItem(d, ctx, {
      group: group._id,
      groupPinned: !!d.groupPinned,
      authorRole: roleOf[String(d.username?._id || d.username)] || null,
    })),
  });
});

export const pendingPosts = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "reviewPosts", group)) return fail(res, 403, "Only group moderators can review posts");

  const { page, limit, skip } = paging(req);
  const match = { group: group._id, groupStatus: "pending", status: { $nin: ["hidden", "deleted"] } };

  const [total, docs] = await Promise.all([
    Reels.countDocuments(match),
    Reels.find(match).sort({ xtime: 1 }).skip(skip).limit(limit)
      .populate("username", AUTHOR_FIELDS).lean(),
  ]);

  const ctx = await buildViewerContext(me.user);
  ok(res, {
    page, limit, total, pages: Math.ceil(total / limit),
    items: docs.map((d) => shapeFeedItem(d, ctx, { group: group._id, groupStatus: "pending" })),
  });
});

const reviewPost = (decision) => wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "reviewPosts", group)) return fail(res, 403, "Only group moderators can review posts");

  const { postId } = req.params;
  if (!isId(postId)) return fail(res, 400, "A valid post id is required");

  const post = await Reels.findOne({ _id: oid(postId), group: group._id });
  if (!post) return fail(res, 404, "Post not found in this group");
  if (post.groupStatus !== "pending") {
    return ok(res, { message: `That post was already ${post.groupStatus}`, status: post.groupStatus });
  }

  const now = new Date();
  post.groupStatus = decision === "approve" ? "approved" : "rejected";
  post.groupReviewedBy = oid(userId);
  post.groupReviewedAt = now;
  post.groupReviewNote = String(req.body?.note || "").trim().slice(0, 500) || null;
  await post.save();

  if (decision === "approve") {
    await Group.updateOne({ _id: group._id }, { $inc: { postCount: 1 }, $set: { lastActivityAt: now } });
    await GroupMember.updateOne(
      { group: group._id, user: post.username },
      { $inc: { postCount: 1 }, $set: { lastActiveAt: now } }
    );
    // Mentions were held back until the post became visible.
    if (post.mentions?.length) {
      await notifyMany(post.mentions, {
        actor: post.username, type: "mention_post", post: post._id, group: group._id,
        preview: post.videoTitle,
      });
    }
  }

  await notify({
    recipient: post.username, actor: userId, type: "group_post",
    post: post._id, group: group._id,
    preview: decision === "approve"
      ? `Your post in ${group.name} was approved`
      : `Your post in ${group.name} wasn't approved${post.groupReviewNote ? `: ${post.groupReviewNote}` : ""}`,
  });

  ok(res, { message: decision === "approve" ? "Post approved" : "Post rejected", status: post.groupStatus });
});

export const approvePost = reviewPost("approve");
export const rejectPost = reviewPost("reject");

export const removeGroupPost = wrap(async (req, res) => {
  const { error, group, me, userId } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);

  const { postId } = req.params;
  if (!isId(postId)) return fail(res, 400, "A valid post id is required");

  const post = await Reels.findOne({ _id: oid(postId), group: group._id });
  if (!post) return fail(res, 404, "Post not found in this group");

  // The author can always withdraw their own post; anyone else needs the right.
  const mine = sameId(post.username, userId);
  if (!mine && !can(me, "removePost", group)) {
    return fail(res, 403, "Only group moderators can remove other people's posts");
  }

  const wasVisible = post.groupStatus === "approved";
  post.groupStatus = "rejected";
  post.groupPinned = false;
  post.groupReviewedBy = oid(userId);
  post.groupReviewedAt = new Date();
  post.groupReviewNote = String(req.body?.note || "").trim().slice(0, 500) || null;
  await post.save();

  if (wasVisible) {
    await Group.updateOne({ _id: group._id }, { $inc: { postCount: -1 } });
    await GroupMember.updateOne({ group: group._id, user: post.username }, { $inc: { postCount: -1 } });
  }
  if (!mine) {
    await notify({
      recipient: post.username, actor: userId, type: "group_post",
      post: post._id, group: group._id,
      preview: `Your post was removed from ${group.name}${post.groupReviewNote ? `: ${post.groupReviewNote}` : ""}`,
    });
  }

  ok(res, { message: "Post removed from the group" });
});

/* At most one pinned post per group, so pinning replaces rather than stacks. */
export const pinGroupPost = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "pinPost", group)) return fail(res, 403, "Only group moderators can pin posts");

  const { postId } = req.params;
  if (!isId(postId)) return fail(res, 400, "A valid post id is required");

  const post = await Reels.findOne({ _id: oid(postId), group: group._id, groupStatus: "approved" }).lean();
  if (!post) return fail(res, 404, "Post not found in this group");

  const pin = req.body?.pin !== false;
  if (pin) await Reels.updateMany({ group: group._id, groupPinned: true }, { $set: { groupPinned: false } });
  await Reels.updateOne({ _id: post._id }, { $set: { groupPinned: pin } });

  ok(res, { message: pin ? "Post pinned" : "Post unpinned", pinned: pin });
});

/* ================================================================== */
/* 6. Group insights                                                   */
/* ================================================================== */

const windowStart = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/*
  Headline numbers for the group admin dashboard.

  Every figure is paired with the same figure for the preceding window of equal
  length, so the screen can show a direction rather than a bare number — "142
  members" says nothing without "+9 this week".
*/
export const insights = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "viewInsights", group)) return fail(res, 403, "Only group moderators can see insights");

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const since = windowStart(days);
  const prevSince = windowStart(days * 2);
  const gid = group._id;

  const [
    memberCount, joined, joinedPrev, left, leftPrev, pending,
    posts, postsPrev, activeAuthors, pendingPostCount, bannedCount,
  ] = await Promise.all([
    GroupMember.countDocuments({ group: gid, status: "active" }),
    GroupMember.countDocuments({ group: gid, status: "active", joinedAt: { $gte: since } }),
    GroupMember.countDocuments({ group: gid, status: "active", joinedAt: { $gte: prevSince, $lt: since } }),
    GroupMember.countDocuments({ group: gid, status: "left", leftAt: { $gte: since } }),
    GroupMember.countDocuments({ group: gid, status: "left", leftAt: { $gte: prevSince, $lt: since } }),
    GroupMember.countDocuments({ group: gid, status: "pending" }),
    Reels.countDocuments({ group: gid, groupStatus: "approved", xtime: { $gte: since } }),
    Reels.countDocuments({ group: gid, groupStatus: "approved", xtime: { $gte: prevSince, $lt: since } }),
    Reels.distinct("username", { group: gid, groupStatus: "approved", xtime: { $gte: since } }),
    Reels.countDocuments({ group: gid, groupStatus: "pending" }),
    GroupMember.countDocuments({ group: gid, status: "banned" }),
  ]);

  // Engagement across the window, counted in one pass over the group's posts.
  const [agg] = await Reels.aggregate([
    { $match: { group: gid, groupStatus: "approved", xtime: { $gte: since } } },
    {
      $group: {
        _id: null,
        likes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
        comments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
        shares: { $sum: { $size: { $ifNull: ["$shares", []] } } },
        views: { $sum: { $ifNull: ["$viewsCount", 0] } },
      },
    },
  ]);

  const engagement = agg || { likes: 0, comments: 0, shares: 0, views: 0 };
  const delta = (now, before) => ({ value: now, previous: before, change: now - before });

  ok(res, {
    windowDays: days,
    members: {
      total: memberCount,
      joined: delta(joined, joinedPrev),
      left: delta(left, leftPrev),
      // Net growth is what an admin actually watches; joins alone hide churn.
      net: joined - left,
      pendingRequests: pending,
      banned: bannedCount,
      // Share of the membership that posted at all in the window.
      activeShare: memberCount ? Math.round((activeAuthors.length / memberCount) * 100) : 0,
    },
    posts: {
      ...delta(posts, postsPrev),
      pendingReview: pendingPostCount,
      activeAuthors: activeAuthors.length,
      perDay: Math.round((posts / days) * 10) / 10,
    },
    engagement: {
      ...engagement,
      total: engagement.likes + engagement.comments + engagement.shares,
      // Interactions per post — the number that says whether the group is alive.
      perPost: posts ? Math.round(((engagement.likes + engagement.comments + engagement.shares) / posts) * 10) / 10 : 0,
    },
  });
});

/* Daily join/leave series for the growth chart. */
export const memberGrowth = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "viewInsights", group)) return fail(res, 403, "Only group moderators can see insights");

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const since = windowStart(days);
  const gid = group._id;

  const bucket = (field) => ([
    { $match: { group: gid, [field]: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${field}` } }, n: { $sum: 1 } } },
  ]);

  const [joins, leaves, priorTotal] = await Promise.all([
    GroupMember.aggregate(bucket("joinedAt")),
    GroupMember.aggregate(bucket("leftAt")),
    // Everyone who had already joined before the window opens, so the running
    // total on the chart starts from the real membership rather than zero.
    GroupMember.countDocuments({ group: gid, joinedAt: { $lt: since, $ne: null } }),
  ]);

  const joinBy = Object.fromEntries(joins.map((j) => [j._id, j.n]));
  const leaveBy = Object.fromEntries(leaves.map((l) => [l._id, l.n]));

  const series = [];
  let running = priorTotal;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const j = joinBy[d] || 0;
    const l = leaveBy[d] || 0;
    running += j - l;
    series.push({ date: d, joined: j, left: l, total: running });
  }

  ok(res, { windowDays: days, series });
});

/* Who is carrying the group. */
export const topContributors = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "viewInsights", group)) return fail(res, 403, "Only group moderators can see insights");

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const since = windowStart(days);

  const rows = await Reels.aggregate([
    { $match: { group: group._id, groupStatus: "approved", xtime: { $gte: since } } },
    {
      $group: {
        _id: "$username",
        posts: { $sum: 1 },
        likes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
        comments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
      },
    },
    // Weighted so someone who writes one post that everyone replies to ranks
    // above someone who posts ten times to silence.
    { $addFields: { score: { $add: ["$posts", { $multiply: ["$likes", 0.5] }, { $multiply: ["$comments", 1.5] }] } } },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);

  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select(MEMBER_FIELDS).lean();
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
  const members = await GroupMember.find({ group: group._id, user: { $in: rows.map((r) => r._id) } })
    .select("user role status").lean();
  const roleOf = Object.fromEntries(members.map((m) => [String(m.user), m]));

  ok(res, {
    windowDays: days,
    contributors: rows.map((r, i) => ({
      rank: i + 1,
      user: byId[String(r._id)] || null,
      role: roleOf[String(r._id)]?.role || null,
      // A top contributor who has since left still explains the numbers.
      stillMember: roleOf[String(r._id)]?.status === "active",
      posts: r.posts,
      likes: r.likes,
      comments: r.comments,
      score: Math.round(r.score * 10) / 10,
    })),
  });
});

export const topPosts = wrap(async (req, res) => {
  const { error, group, me } = await context(req, { requireMember: true });
  if (error) return fail(res, ...error);
  if (!can(me, "viewInsights", group)) return fail(res, 403, "Only group moderators can see insights");

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  const docs = await Reels.find({
    group: group._id,
    groupStatus: "approved",
    xtime: { $gte: windowStart(days) },
  })
    .populate("username", AUTHOR_FIELDS)
    .lean();

  const scored = docs
    .map((d) => ({
      doc: d,
      score: (d.likes?.length || 0) + (d.comments?.length || 0) * 2 + (d.shares?.length || 0) * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const ctx = await buildViewerContext(me.user);
  ok(res, {
    windowDays: days,
    posts: scored.map(({ doc, score }, i) =>
      shapeFeedItem(doc, ctx, { rank: i + 1, score, group: group._id })
    ),
  });
});
