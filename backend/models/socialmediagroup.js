import mongoose from "mongoose";

const { Schema, model } = mongoose;

/*
  A single rule in the group's rule book. Rules are ordered and versioned as a
  set: `rulesVersion` on the group bumps whenever the list changes, which is
  what lets a moderator tell who joined under the current rules and who joined
  under an older set.
*/
const GroupRuleSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000 },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

/*
  Who may do what inside the group.

  `postPolicy` is deliberately separate from `isPrivate`: privacy controls who
  can *see* the group, posting control is who can *write* in it. A public group
  that only admins post in is a page; a private group anyone inside can post in
  is a community. Conflating the two makes both impossible.
*/
const GroupSettingsSchema = new Schema({
  // anyone   - any active member posts straight to the feed
  // approval - member posts land in a moderation queue first
  // admins   - only owner/admin/moderator may post
  postPolicy: { type: String, enum: ["anyone", "approval", "admins"], default: "anyone" },
  // Private groups always review joins; a public group may opt in.
  approveMembers: { type: Boolean, default: false },
  // Members may invite other members.
  membersCanInvite: { type: Boolean, default: true },
  // Force new members past the rules screen before their join completes.
  requireRulesAccept: { type: Boolean, default: false },
  // Shown above the request form in the join sheet.
  joinQuestion: { type: String, trim: true, maxlength: 300 },
}, { _id: false });

const groupSchema = new Schema({
  name: { type: String, required: true, trim: true },
  logo: { type: String }, // URL to S3/Cloudinary
  description: { type: String },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },

  /*
    Legacy membership arrays.

    Superseded by the `groupmember` collection, which carries roles, states and
    timestamps. Still written on every membership change so the original
    /api/socialgroup endpoints keep returning what they always returned — read
    them for compatibility, never as the source of truth.
  */
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],

  isPrivate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },

  /* ================================================================
     Groups & Community additions. All additive — every field below has
     a default, so documents written before this existed keep loading.
     ================================================================ */

  // Banner behind the group header, distinct from the square `logo`.
  coverImage: { type: String },
  category: { type: String, trim: true },
  // Free-text discovery tags, lowercased on write.
  tags: { type: [String], default: [] },

  /*
    Visibility, kept alongside `isPrivate` rather than replacing it.
      public - anyone finds it, anyone reads it
      private - anyone finds it, only members read it
      secret - only members find it at all
    `isPrivate` stays in sync so legacy readers keep working.
  */
  visibility: { type: String, enum: ["public", "private", "secret"], default: "public" },

  settings: { type: GroupSettingsSchema, default: () => ({}) },

  rules: { type: [GroupRuleSchema], default: [] },
  // Bumped on every rules edit; compared against GroupMember.rulesAcceptedVersion.
  rulesVersion: { type: Number, default: 0 },

  /*
    Denormalised counters. Kept current on membership and post writes so a
    group card can render a member count without counting a collection, which
    is the query that gets slow first on a group list screen.
  */
  memberCount: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
  postCount: { type: Number, default: 0 },

  lastActivityAt: { type: Date, default: Date.now },

  // Soft delete, matching how posts are removed elsewhere in the module: the
  // row stays so memberships and posts can be cleaned up deliberately.
  deletedAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },
});

groupSchema.index({ visibility: 1, lastActivityAt: -1 });
groupSchema.index({ creator: 1 });
groupSchema.index({ name: "text", description: "text" });
groupSchema.index({ tags: 1 });

const SocialgroupModal = model("socialgroup", groupSchema);
export default SocialgroupModal;

//socialmediagroupRoute
