import mongoose from "mongoose";

// Define sub-schema for interactions
// Shared by likes / dislikes / favorites / shares / savepost.
// `type` only carries meaning on `likes`, where it holds the reaction. Rows
// written before reactions existed have no `type` and read back as "like".
export const REACTIONS = ["like", "love", "haha", "wow", "sad", "angry"];

const interactionSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  count: { type: Number, default: 1 },
  type: { type: String, enum: REACTIONS, default: "like" },
  xtime: { type: Date, default: Date.now }
});

const sharepostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  text: { type: String, trim: true },
  originalPost: { type: mongoose.Schema.Types.ObjectId, ref: "Reels", required: true },
  xtime: { type: Date, default: Date.now }
});

const starSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  count: { type: Number, default: 1 },
  userinfo: {type : Object},
  amount: {type : Number, default: 0},
  xtime: { type: Date, default: Date.now }
});

// Define sub-schema for comment likes
const commentLikeSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  count: { type: Number, default: 1 },
  userinfo: {type : Object},
  xtime: { type: Date, default: Date.now }
});

const commentReplyLikeSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  message: { type: String },
  userinfo: {type : Object},
  xtime: { type: Date, default: Date.now }
});


// Define sub-schema for comments
const commentSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  message: { type: String, required: true },  // The comment text
  timestamp: { type: Date, default: Date.now }, // When the comment was posted
  likes: { type: [commentLikeSchema], default: [] }, // Users who liked the comment
  // Legacy single-level replies. Still read so old threads keep rendering;
  // new replies are stored as comments carrying `parentId` instead.
  reply: { type: [commentReplyLikeSchema], default: [] },

  /* ---- threading ---- */
  // null for a top-level comment, otherwise the _id of the comment replied to.
  // Replies live in the same array so one write reaches any depth without
  // walking a nested tree.
  parentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  // Denormalised author of the comment being replied to, so "replying to @x"
  // renders without another lookup.
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  editedAt: { type: Date, default: null },
  // Soft delete: a removed parent still has to hold its replies together.
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },

  /*
    Set when the post's author approves a comment left by someone they have
    restricted. Until then the comment is visible only to its writer, who is
    given no signal that anyone else cannot see it.
  */
  restrictedApproved: { type: Boolean, default: false }
});

/* ---- Social Feed (Timeline) sub-schemas ---- */

// One item of a carousel. A single-image post simply has one of these.
const MediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ["image", "video"], default: "image" },
  thumbnail: { type: String },
  width: { type: Number },
  height: { type: Number },
  duration: { type: Number },   // seconds, video only
  altText: { type: String },    // accessibility / AI caption slot
  order: { type: Number, default: 0 },
}, { _id: false });

const PollOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
}, { _id: false });

const PollSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options: { type: [PollOptionSchema], validate: v => v.length >= 2 && v.length <= 6 },
  multiple: { type: Boolean, default: false },  // allow picking more than one
  endsAt: { type: Date },                        // null means it never closes
  closed: { type: Boolean, default: false },
}, { _id: false });

// GeoJSON point. Its own schema so it is only ever written as a whole:
// `coordinates` is required, so a Point can never be stored without one.
const GeoPointSchema = new mongoose.Schema({
  type: { type: String, enum: ["Point"], default: "Point" },
  coordinates: { type: [Number], required: true }, // [lng, lat]
}, { _id: false });

// Structured check-in. `location` is GeoJSON so a 2dsphere index works.
const PlaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String },
  city: { type: String },
  country: { type: String },
  placeId: { type: String },   // external provider id, if the app has one
  // `default: undefined` keeps this absent for a name-only check-in. Declared
  // inline, Mongoose applies the `type: "Point"` default on its own and stores
  // a coordinate-less Point, which the 2dsphere index below cannot index — and
  // that makes *every* later update to the post fail with "Can't extract geo
  // keys", including adding a comment or a like.
  location: { type: GeoPointSchema, default: undefined },
}, { _id: false });

/*
  Music attached to a video or story. The track is referenced so the library
  stays the single source of truth, but title/artist/url are copied alongside
  it: a post has to keep rendering its sound strip even if the track is later
  pulled from the catalogue.
*/
const TrackSchema = new mongoose.Schema({
  track: { type: mongoose.Schema.Types.ObjectId, ref: "musictbl" },
  title: { type: String },
  artist: { type: String },
  url: { type: String },
  coverImage: { type: String },
  // Which slice of the track plays, in seconds from its start.
  startAt: { type: Number, default: 0, min: 0 },
  duration: { type: Number, min: 0 },
  volume: { type: Number, default: 1, min: 0, max: 1 },
}, { _id: false });

/*
  Capture-time treatment. Applied on the device; recorded here so the post can
  be re-rendered or audited with the same look.
*/
const EffectsSchema = new mongoose.Schema({
  filter: { type: mongoose.Schema.Types.ObjectId, ref: "filters" },
  filterName: { type: String },
  intensity: { type: Number, default: 1, min: 0, max: 1 },
  beauty: {
    smooth:   { type: Number, min: 0, max: 1 },
    slim:     { type: Number, min: 0, max: 1 },
    brighten: { type: Number, min: 0, max: 1 },
    eyes:     { type: Number, min: 0, max: 1 },
  },
}, { _id: false });

const TaggedUserSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  // Position on the image as a 0-1 fraction, for photo tags
  x: { type: Number, min: 0, max: 1 },
  y: { type: Number, min: 0, max: 1 },
  mediaIndex: { type: Number, default: 0 },  // which carousel item
  approved: { type: Boolean, default: true }, // tagged user may remove themselves
}, { _id: false });

const videoSchema = new mongoose.Schema({
  videoUrl: { type: Object, required: true },
  videoTitle: { type: String },
  videosound: { type: String },  
  textoverlays: { type: Object },
  emojioverlays: { type: Object },
  sound: { type: Object },
  posttype: { type: String },
  posttypechild: { type: String },
  xbackgroundcolor: {type: String},
  xfontstyle: {type: String},
  xfontsize: {type: String},
  xtextalign: {type: String},
  ispost:  { type: String },
  //username: { type: String, index: true }, // Indexed for faster queries
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  xtime: { type: Date, default: Date.now },
  likes: { type: [interactionSchema], default: [] },
  dislikes: { type: [interactionSchema], default: [] },
  // Updated comments schema with username, message, and likes
  comments: { type: [commentSchema], default: [] },
  favorites: { type: [interactionSchema], default: [] },
  shares: { type: [interactionSchema], default: [] },
  savepost: { type: [interactionSchema], default: [] },
  sharepost: { type: [sharepostSchema], default: [] },
  stars: { type: [starSchema], default: [] },
  tagpeople: { type: Object },
  location: { type: String },
  status: {
    type: String
  },

  /*
    Who this individual post is for.

    The account-level `privacySettings.posts` says who may see the account's
    posts in general; this overrides it for one post, which is what "Post
    Visibility Controls" means — a private thought on an otherwise public
    account, or one public announcement from a followers-only account.

    `onlyMe` is deliberately separate from deleting: an author archiving a post
    still wants it in their own profile.
  */
  audience: {
    type: String,
    enum: ["everyone", "followers", "closeFriends", "onlyMe"],
    default: "everyone",
  },

  /*
    Marks content that under-18s must not be shown. Set by the author or by a
    moderator; enforcement reads the viewer's date of birth.
  */
  ageRestricted: { type: Boolean, default: false },
  status_draft_publish: {
    type: String,
    // "Scheduled" is a third resting state: written, not a draft any more, and
    // not yet public. The feed filters on `$ne: "Draft"`, so a scheduled post
    // must be excluded by its own date rather than by this field alone.
    enum: ["Draft", "Publish", "Scheduled"],
    default: "Draft",
    required: true,
  },

  /*
    When a scheduled post should go public. Null for everything else.

    The feed excludes a post whose `scheduledFor` is still in the future, so a
    scheduler that fails to run late can never leak a post early — the date is
    the source of truth, and publishing merely flips the flag to match it.
  */
  scheduledFor: { type: Date, default: null },

  /*
    The live boost, if any. Denormalised onto the post so ranking does not have
    to join every candidate against the campaign collection.
  */
  boostedUntil: { type: Date, default: null },
  boostCampaign: { type: mongoose.Schema.Types.ObjectId, ref: "adcampaign", default: null },
  sharegroup: { type: Object },

  /* ================================================================
     Social Feed (Timeline) additions.

     All additive. `videoUrl` and `location` are still written by the
     create endpoints so the existing mobile screens keep working while
     new screens move to `media[]` and `place`.
     ================================================================ */

  // Carousel: ordered media items. Single-item posts have one entry.
  media: { type: [MediaSchema], default: [] },

  // Polls in posts
  poll: { type: PollSchema, default: undefined },

  // Structured check-in / location tag (supersedes the free-text `location`)
  place: { type: PlaceSchema, default: undefined },

  // Tag friends: users tagged in the post, optionally positioned on the photo
  taggedUsers: { type: [TaggedUserSchema], default: [] },

  // Structured music (supersedes the loose `sound` / `videosound` objects)
  music: { type: TrackSchema, default: undefined },

  // Camera filter / beauty settings used at capture
  effects: { type: EffectsSchema, default: undefined },

  // Draft bookkeeping. `status_draft_publish` above holds the state; these
  // record when it last moved, so a drafts list can sort by real recency.
  draftUpdatedAt: { type: Date, default: null },
  publishedAt: { type: Date, default: null },

  // Soft delete. The row stays so counters, notifications and shares that
  // point at it can be cleaned up deliberately rather than dangling.
  deletedAt: { type: Date, default: null },

  // Extracted from the caption on save; lowercased, no leading #
  hashtags: { type: [String], default: [], index: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],

  // Stories expire 24h after posting. Filtered on read rather than deleted,
  // so the author keeps their archive and highlights stay possible.
  expiresAt: { type: Date, default: null },

  // Reach + story seen-state
  viewsCount: { type: Number, default: 0 },

  /*
    Impressions are not views.

    `viewsCount` counts distinct accounts, because markViewed() dedupes through
    `viewedBy` — that figure is the post's reach. An impression is every time the
    post was put in front of someone, the same person scrolling past it twice
    included. Analytics needs both: reach without impressions cannot show how
    hard a post was pushed, and impressions without reach flatters a post shown
    repeatedly to the same handful of people.
  */
  impressions: { type: Number, default: 0 },
  viewedBy: {
    type: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      at: { type: Date, default: Date.now },
    }],
    default: [],
  },

  // Cached ranking inputs, refreshed when the feed scores a document
  engagementScore: { type: Number, default: 0 },
  scoredAt: { type: Date, default: null },

  /* ---- Groups & Community ---- */

  // The group this post belongs to. Absent/null for an ordinary timeline post,
  // which is what keeps group content out of the public feed: baseMatch()
  // filters on `group: null` and a missing field matches that in Mongo.
  group: { type: mongoose.Schema.Types.ObjectId, ref: "socialgroup", default: null },

  /*
    Moderation state inside the group.

    `approved` for a post in an open group, `pending` where the group's
    postPolicy is "approval". A rejected post keeps its row so the author can
    be told why rather than watching it silently vanish.
  */
  groupStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
  groupReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  groupReviewedAt: { type: Date, default: null },
  groupReviewNote: { type: String, default: null },
  // Admin-pinned to the top of the group feed. At most one per group.
  groupPinned: { type: Boolean, default: false },
});

/* ---- indexes the feed queries rely on ---- */
videoSchema.index({ posttype: 1, xtime: -1 });
videoSchema.index({ username: 1, xtime: -1 });
videoSchema.index({ hashtags: 1, xtime: -1 });
videoSchema.index({ expiresAt: 1 });
videoSchema.index({ engagementScore: -1, xtime: -1 });
videoSchema.index({ "taggedUsers.user": 1, xtime: -1 });
videoSchema.index({ "comments.parentId": 1 });
videoSchema.index({ username: 1, status_draft_publish: 1, draftUpdatedAt: -1 });
videoSchema.index({ "music.track": 1, xtime: -1 });
videoSchema.index({ "savepost.username": 1, xtime: -1 });
// Geospatial index for "nearby" / location discovery
videoSchema.index({ "place.location": "2dsphere" });
// Group feed, and the moderation queue that reads the same collection
videoSchema.index({ group: 1, groupStatus: 1, xtime: -1 });

// Create Model
const Reels = mongoose.model("Reels", videoSchema);
export default Reels;
