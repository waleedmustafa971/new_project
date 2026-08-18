/*
  Group Chat — mobile-facing API.

  The sheet marks this 80 % and budgets a day. What existed was a create
  endpoint and two readers on /apis/voice, and all three were broken or
  half-built:

    - getmessengergroup filters on `createdBy`, so it returns only groups you
      founded and never a group you were added to — which is most of them
    - it populates `username userimage`, fields that do not exist on the user
      model (they are `name` and `image`), so member info came back empty
    - get-group-message populates path `message` while the schema field is
      `messages`, then returns `group.message` — always undefined
    - createGroupChat does not put the creator in `members` or `admins`, so a
      new group has no members and nobody who can administer it
    - send-group-message never checks membership, so anyone holding a group id
      can post into it

  Worse than any of those individually: those endpoints push messages into
  `GroupChat.messages[]`, a different store from the `ConversationModel` the
  shipped messaging module uses. Group chats built that way get none of the
  reactions, receipts, disappearing timers or attachments that were built for
  messaging.

  So this controller manages groups and gives each one a `ConversationModel` of
  type "group", and message traffic goes through the existing, tested
  /apis/messaging conversation endpoints. The legacy trio is left in place,
  untouched, for anything still calling it.
*/

import mongoose from "mongoose";
import { GroupChat } from "../models/Groupchat.js";
import { ConversationModel } from "../models/ConversationModel.js";
import User from "../models/users.js";

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[groupchat]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 20) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const MEMBER_FIELDS = "name image verifiedBadge accountType";
const MAX_MEMBERS = 256;

const has = (list, id) => (list || []).some((x) => String(x) === String(id));
/* `createdBy` is a String on the schema, so it is compared as one. */
const isFounder = (g, id) => String(g.createdBy) === String(id);
const isAdmin = (g, id) => isFounder(g, id) || has(g.admins, id);

/*
  Resolve (group, actor) and the actor's standing in it. Returns { error } with
  a ready code/message, so every endpoint starts the same way.
*/
const context = async (req, { requireMember = true, requireAdmin = false } = {}) => {
  const userId = actorId(req);
  const { groupId } = req.params;

  if (!isId(groupId)) return { error: [400, "A valid group id is required"] };
  if (!isId(userId)) return { error: [400, "A valid userId is required"] };

  const group = await GroupChat.findById(groupId).lean();
  if (!group || group.deletedAt) return { error: [404, "Group not found"] };

  const member = has(group.members, userId);
  const admin = isAdmin(group, userId);

  if (requireMember && !member) return { error: [403, "You're not a member of this group"] };
  if (requireAdmin && !admin) return { error: [403, "Only group admins can do that"] };

  return { group, userId, member, admin };
};

/*
  Every group gets exactly one conversation, created with it. Looked up rather
  than assumed so a group made through the legacy endpoint — which creates no
  conversation — gets one the first time it is opened here.
*/
const conversationFor = async (group) => {
  let convo = await ConversationModel.findOne({ group: group._id }).lean();
  if (convo) return convo;

  convo = await ConversationModel.create({
    type: "group",
    group: group._id,
    // `sender` is required on the schema and carries no meaning for a group;
    // the founder is used so the field holds something truthful.
    sender: oid(group.createdBy),
    messages: [],
    lastMessageAt: null,
  });
  return convo.toObject();
};

const shapeGroup = (g, userId, extras = {}) => ({
  _id: g._id,
  groupName: g.groupName,
  groupimage: g.groupimage || null,
  description: g.description || "",
  createdBy: g.createdBy,
  memberCount: (g.members || []).length,
  adminCount: (g.admins || []).length,
  isAdmin: isAdmin(g, userId),
  isFounder: isFounder(g, userId),
  isMember: has(g.members, userId),
  permissions: {
    groupPermission: g.groupPermission || "all_members",
    sendmessagepermission: g.sendmessagepermission || "all_members",
    editgroupsetting: g.editgroupsetting || "admin_only",
    isDisappearing: g.isDisappearing || "no",
  },
  createdAt: g.createdAt,
  updatedAt: g.updatedAt,
  ...extras,
});

/* ================================================================== */
/* Create, read, update                                                */
/* ================================================================== */

export const createGroup = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const {
    groupName, description = "", groupimage,
    members = [], admins = [],
    groupPermission, sendmessagepermission, editgroupsetting, isDisappearing,
  } = req.body || {};

  if (!String(groupName || "").trim()) return fail(res, 400, "A group needs a name");
  if (String(groupName).trim().length > 100) return fail(res, 400, "Group name is too long (100 characters max)");

  // The creator is always a member and an admin. Without this a new group has
  // nobody in it and nobody who can administer it.
  const memberIds = [...new Set([String(userId), ...members.filter(isId).map(String)])];
  if (memberIds.length > MAX_MEMBERS) return fail(res, 400, `A group can hold at most ${MAX_MEMBERS} members`);

  // Only real, non-deleted accounts get added.
  const real = await User.find({
    _id: { $in: memberIds.filter(isId).map(oid) },
    accountStatus: { $nin: ["deleted", "banned"] },
  }).select("_id").lean();
  const valid = real.map((u) => String(u._id));
  if (!valid.includes(String(userId))) return fail(res, 404, "User not found");

  const adminIds = [...new Set([String(userId), ...admins.filter(isId).map(String)])]
    .filter((id) => valid.includes(id));

  const group = await GroupChat.create({
    groupName: String(groupName).trim(),
    description: String(description).trim().slice(0, 500),
    groupimage,
    createdBy: String(userId),
    members: valid.map(oid),
    admins: adminIds.map(oid),
    groupPermission: ["admin_only", "all_members"].includes(groupPermission) ? groupPermission : "all_members",
    sendmessagepermission: sendmessagepermission || "all_members",
    editgroupsetting: editgroupsetting || "admin_only",
    isDisappearing: isDisappearing || "no",
    messages: [],
  });

  // Created together, so group messaging goes through the shipped conversation
  // endpoints from the first message rather than a second, parallel store.
  const convo = await conversationFor(group.toObject());

  ok(res, {
    message: "Group created",
    group: shapeGroup(group.toObject(), userId, { conversationId: convo._id }),
  });
});

/*
  Groups the caller is in. Filters on `members`, which is the fix for the
  legacy endpoint returning only groups you founded.
*/
export const myGroups = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filter = { members: oid(userId), deletedAt: null };
  const [total, groups] = await Promise.all([
    GroupChat.countDocuments(filter),
    GroupChat.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip).limit(limit)
      .populate("members", MEMBER_FIELDS)   // real field names, so this is populated
      .lean(),
  ]);

  const convos = await ConversationModel.find({ group: { $in: groups.map((g) => g._id) } })
    .select("group lastMessageAt messages mutedBy")
    .lean();
  const convoBy = Object.fromEntries(convos.map((c) => [String(c.group), c]));

  ok(res, {
    page, limit, total,
    pages: Math.ceil(total / limit),
    groups: groups.map((g) => {
      const c = convoBy[String(g._id)];
      return shapeGroup(g, userId, {
        conversationId: c?._id || null,
        lastMessageAt: c?.lastMessageAt || null,
        messageCount: (c?.messages || []).length,
        muted: has(c?.mutedBy, userId),
        // A short preview of who is in it, for the list row.
        memberPreview: (g.members || []).slice(0, 4),
      });
    }),
  });
});

export const getGroup = wrap(async (req, res) => {
  const { error, group, userId } = await context(req);
  if (error) return fail(res, ...error);

  const [full, convo] = await Promise.all([
    GroupChat.findById(group._id)
      .populate("members", MEMBER_FIELDS)
      .populate("admins", MEMBER_FIELDS)
      .lean(),
    conversationFor(group),
  ]);

  ok(res, {
    group: shapeGroup(full, userId, {
      members: full.members,
      admins: full.admins,
      conversationId: convo._id,
      lastMessageAt: convo.lastMessageAt || null,
    }),
  });
});

export const updateGroup = wrap(async (req, res) => {
  const { error, group, userId, admin } = await context(req);
  if (error) return fail(res, ...error);

  // `editgroupsetting` decides whether ordinary members may edit; admins always may.
  const membersMayEdit = String(group.editgroupsetting || "").toLowerCase() === "all_members";
  if (!admin && !membersMayEdit) return fail(res, 403, "Only group admins can edit this group");

  const b = req.body || {};
  const patch = {};

  if (b.groupName !== undefined) {
    const n = String(b.groupName).trim();
    if (!n) return fail(res, 400, "A group needs a name");
    if (n.length > 100) return fail(res, 400, "Group name is too long (100 characters max)");
    patch.groupName = n;
  }
  if (b.description !== undefined) patch.description = String(b.description).trim().slice(0, 500);
  if (b.groupimage !== undefined) patch.groupimage = b.groupimage;

  // Permission changes are admin-only regardless of editgroupsetting — letting
  // members edit the name must not let them hand themselves the group.
  for (const key of ["groupPermission", "sendmessagepermission", "editgroupsetting", "isDisappearing"]) {
    if (b[key] === undefined) continue;
    if (!admin) return fail(res, 403, "Only group admins can change permissions");
    if (key === "groupPermission" && !["admin_only", "all_members"].includes(b[key])) {
      return fail(res, 400, "groupPermission must be admin_only or all_members");
    }
    patch[key] = b[key];
  }

  if (!Object.keys(patch).length) return fail(res, 400, "Nothing to update");

  const updated = await GroupChat.findByIdAndUpdate(group._id, { $set: patch }, { new: true }).lean();
  ok(res, { message: "Group updated", group: shapeGroup(updated, userId) });
});

/* Soft delete, so the conversation and its history are not orphaned. */
export const deleteGroup = wrap(async (req, res) => {
  const { error, group, userId } = await context(req);
  if (error) return fail(res, ...error);
  if (!isFounder(group, userId)) return fail(res, 403, "Only the group creator can delete it");

  await GroupChat.updateOne({ _id: group._id }, { $set: { deletedAt: new Date() } });
  ok(res, { message: "Group deleted", groupId: group._id });
});

/* ================================================================== */
/* Members and admins                                                  */
/* ================================================================== */

export const listMembers = wrap(async (req, res) => {
  const { error, group, userId } = await context(req);
  if (error) return fail(res, ...error);

  const full = await GroupChat.findById(group._id).populate("members", MEMBER_FIELDS).lean();

  ok(res, {
    total: (full.members || []).length,
    members: (full.members || []).map((m) => ({
      ...m,
      isAdmin: isAdmin(group, m._id),
      isFounder: isFounder(group, m._id),
      isSelf: String(m._id) === String(userId),
    })),
  });
});

export const addMembers = wrap(async (req, res) => {
  const { error, group, userId, admin } = await context(req);
  if (error) return fail(res, ...error);

  // `groupPermission` gates who may bring people in.
  const membersMayAdd = (group.groupPermission || "all_members") === "all_members";
  if (!admin && !membersMayAdd) return fail(res, 403, "Only group admins can add members");

  const ids = (Array.isArray(req.body?.memberIds) ? req.body.memberIds : [])
    .filter(isId).map(String);
  if (!ids.length) return fail(res, 400, "memberIds is required");

  const already = ids.filter((id) => has(group.members, id));
  const fresh = ids.filter((id) => !has(group.members, id));

  if ((group.members || []).length + fresh.length > MAX_MEMBERS) {
    return fail(res, 400, `A group can hold at most ${MAX_MEMBERS} members`);
  }

  const real = await User.find({
    _id: { $in: fresh.filter(isId).map(oid) },
    accountStatus: { $nin: ["deleted", "banned"] },
  }).select("_id").lean();
  const valid = real.map((u) => String(u._id));
  const missing = fresh.filter((id) => !valid.includes(id));

  if (valid.length) {
    await GroupChat.updateOne(
      { _id: group._id },
      { $addToSet: { members: { $each: valid.map(oid) } } }
    );
  }

  ok(res, {
    message: `${valid.length} added`,
    added: valid,
    alreadyMembers: already,
    notFound: missing,
  });
});

export const removeMember = wrap(async (req, res) => {
  const { error, group, userId, admin } = await context(req);
  if (error) return fail(res, ...error);

  const target = req.params.memberId;
  if (!isId(target)) return fail(res, 400, "A valid memberId is required");
  if (String(target) === String(userId)) return fail(res, 400, "Use leave to remove yourself");
  if (!admin) return fail(res, 403, "Only group admins can remove members");
  if (!has(group.members, target)) return fail(res, 404, "They're not a member of this group");
  // The founder is the one member nobody can remove; otherwise an admin they
  // appointed could take the group from them.
  if (isFounder(group, target)) return fail(res, 403, "The group creator can't be removed");

  await GroupChat.updateOne(
    { _id: group._id },
    { $pull: { members: oid(target), admins: oid(target) } }
  );
  ok(res, { message: "Member removed" });
});

export const leaveGroup = wrap(async (req, res) => {
  const { error, group, userId } = await context(req);
  if (error) return fail(res, ...error);

  /*
    The founder cannot walk out and strand the group: they hand it to another
    admin first, or delete it. Same rule as social groups.
  */
  if (isFounder(group, userId)) {
    return fail(res, 400, "Transfer the group to another admin before leaving, or delete it");
  }

  await GroupChat.updateOne(
    { _id: group._id },
    { $pull: { members: oid(userId), admins: oid(userId) } }
  );
  ok(res, { message: "You've left the group" });
});

export const setAdmin = wrap(async (req, res) => {
  const { error, group, userId, admin } = await context(req);
  if (error) return fail(res, ...error);
  if (!admin) return fail(res, 403, "Only group admins can change admins");

  const target = req.params.memberId;
  const make = req.body?.admin !== false;
  if (!isId(target)) return fail(res, 400, "A valid memberId is required");
  if (!has(group.members, target)) return fail(res, 404, "They're not a member of this group");
  if (isFounder(group, target) && !make) {
    return fail(res, 403, "The group creator can't be demoted");
  }

  await GroupChat.updateOne(
    { _id: group._id },
    make ? { $addToSet: { admins: oid(target) } } : { $pull: { admins: oid(target) } }
  );
  ok(res, { message: make ? "Promoted to admin" : "Removed as admin", isAdmin: make });
});

/* Hand the group to another admin, so the founder can then leave. */
export const transferGroup = wrap(async (req, res) => {
  const { error, group, userId } = await context(req);
  if (error) return fail(res, ...error);
  if (!isFounder(group, userId)) return fail(res, 403, "Only the group creator can transfer it");

  const target = req.body?.newOwnerId;
  if (!isId(target)) return fail(res, 400, "newOwnerId is required");
  if (String(target) === String(userId)) return fail(res, 400, "You already own this group");
  if (!has(group.members, target)) return fail(res, 404, "They're not a member of this group");

  await GroupChat.updateOne(
    { _id: group._id },
    { $set: { createdBy: String(target) }, $addToSet: { admins: oid(target) } }
  );
  ok(res, { message: "Group transferred", newOwner: target });
});

/* ================================================================== */
/* Conversation handoff                                                */
/* ================================================================== */

/*
  The group's conversation id. Message traffic — sending, history, reactions,
  receipts, disappearing timers, attachments — all runs through the shipped
  /apis/messaging conversation endpoints against this id, so group chat gets
  every one of those features rather than a second, thinner implementation.
*/
export const groupConversation = wrap(async (req, res) => {
  const { error, group, userId } = await context(req);
  if (error) return fail(res, ...error);

  const convo = await conversationFor(group);
  const canSend =
    (group.sendmessagepermission || "all_members") === "all_members" || isAdmin(group, userId);

  ok(res, {
    conversationId: convo._id,
    groupId: group._id,
    canSend,
    messageCount: (convo.messages || []).length,
    lastMessageAt: convo.lastMessageAt || null,
    disappearingSeconds: convo.disappearingSeconds || null,
    // Where the client goes next.
    endpoints: {
      messages: `/apis/messaging/conversations/${convo._id}/messages`,
      markRead: `/apis/messaging/conversations/${convo._id}/read`,
      media: `/apis/messaging/conversations/${convo._id}/media`,
    },
  });
});
