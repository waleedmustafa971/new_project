import mongoose from "mongoose";

/*
  Group membership (Groups & Community module).

  One row per (group, user). Membership is stored as rows rather than as arrays
  on the group document for three reasons:

    - a join request and a membership are the same row in different states, so
      approving is a status flip. Moving an id between a `pendingRequests` array
      and a `members` array is two writes that can half-apply, which is how a
      user ends up both pending and joined.
    - `joinedAt` per member is what makes member-growth insights possible at
      all; an array of ids has no timestamps.
    - a group with 50k members does not have to be loaded in full to answer
      "is this person a member?".

  The legacy arrays on the group document are still written alongside these
  rows (see helpers/groups.js), so /api/socialgroup/list keeps returning the
  shape it always returned.
*/

export const GROUP_ROLES = ["owner", "admin", "moderator", "member"];

/*
  `pending`  - asked to join a private group, awaiting review
  `invited`  - asked by an admin, awaiting the user's acceptance
  `active`   - a member
  `rejected` - request turned down; kept so a re-request is a deliberate act
  `banned`   - removed and barred from re-joining
  `left`     - left voluntarily; kept for growth stats and re-join history
*/
export const MEMBER_STATUS = ["pending", "invited", "active", "rejected", "banned", "left"];

const groupMemberSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "socialgroup", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  role: { type: String, enum: GROUP_ROLES, default: "member" },
  status: { type: String, enum: MEMBER_STATUS, default: "active" },

  // Free-text answer to the group's join question, shown in the review queue.
  requestNote: { type: String, trim: true, maxlength: 500 },

  // Which rules version the member accepted on joining. A group that rewrites
  // its rules can tell who has seen the current set.
  rulesAcceptedVersion: { type: Number, default: null },
  rulesAcceptedAt: { type: Date, default: null },

  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  reviewedAt: { type: Date, default: null },
  // Why a request was rejected or a member banned — the rule it broke, when
  // the moderator cited one.
  reviewNote: { type: String, trim: true, maxlength: 500 },

  requestedAt: { type: Date, default: Date.now },
  joinedAt: { type: Date, default: null },
  leftAt: { type: Date, default: null },

  // Cheap activity counters, incremented on write. Insights reads these for
  // the top-contributors board instead of aggregating every post each time.
  postCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  lastActiveAt: { type: Date, default: null },
}, { timestamps: true });

// The uniqueness that makes join/approve idempotent: one row per person per
// group, whatever state it is in.
groupMemberSchema.index({ group: 1, user: 1 }, { unique: true });
groupMemberSchema.index({ group: 1, status: 1, joinedAt: -1 });
groupMemberSchema.index({ group: 1, role: 1 });
groupMemberSchema.index({ user: 1, status: 1 });
// Member-growth series: joins bucketed by day for one group.
groupMemberSchema.index({ group: 1, joinedAt: 1 });

const GroupMember = mongoose.model("groupmember", groupMemberSchema);
export default GroupMember;
