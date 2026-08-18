
import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
location: String,
houseNumber: String,
name: String,
mobile: String,
instructions: String,
latitude: Number,
longitude: Number,
modulename : String
});

/*
  Per-area privacy controls used when privacy === "custom".
  "followers" means approved followers only; "closeFriends" is the allow list
  on the user document.
*/
const AUDIENCE = ["everyone", "followers", "closeFriends", "nobody"];

const PrivacySettingsSchema = new mongoose.Schema({
  posts:         { type: String, enum: AUDIENCE, default: "everyone" },
  stories:       { type: String, enum: AUDIENCE, default: "everyone" },
  reels:         { type: String, enum: AUDIENCE, default: "everyone" },
  followersList: { type: String, enum: AUDIENCE, default: "everyone" },
  profilePhoto:  { type: String, enum: AUDIENCE, default: "everyone" },
  bio:           { type: String, enum: AUDIENCE, default: "everyone" },
  onlineStatus:  { type: String, enum: AUDIENCE, default: "everyone" },
  messages:      { type: String, enum: AUDIENCE, default: "everyone" },
  comments:      { type: String, enum: AUDIENCE, default: "everyone" },
  tagging:       { type: String, enum: AUDIENCE, default: "everyone" },
  mentions:      { type: String, enum: AUDIENCE, default: "everyone" },
  // Whether the account shows up in search and suggestions at all
  discoverable:  { type: Boolean, default: true },
  // Show read receipts / "seen" state in chat
  readReceipts:  { type: Boolean, default: true },
}, { _id: false });

/*
  Per-type notification switches. `push` and `inApp` are master switches: with
  `inApp` off nothing is recorded at all, with `push` off records are still
  written so the in-app list keeps filling, but no FCM message is sent.
*/
const NotificationPrefsSchema = new mongoose.Schema({
  push:         { type: Boolean, default: true },
  inApp:        { type: Boolean, default: true },
  likes:        { type: Boolean, default: true },
  comments:     { type: Boolean, default: true },
  replies:      { type: Boolean, default: true },
  commentLikes: { type: Boolean, default: true },
  mentions:     { type: Boolean, default: true },
  tags:         { type: Boolean, default: true },
  follows:      { type: Boolean, default: true },
  shares:       { type: Boolean, default: true },
  live:         { type: Boolean, default: true },
  groups:       { type: Boolean, default: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: { type: String },
    firstname: { type: String },
    lastname: { type: String },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    mobileno: { type: String },
    status: { type: String },
    emailaddress: { type: String },
    dateofbirth: { type: String },
    bio: { type: String },
    nationality: { type: String }, //Gender
    interest: { type: String }, //Gender
    gender: { type: String }, //Gender
    type: { type: String }, //Gender
    regtype: { type: String }, //Mobile / Email
    regby: { type: String }, //Google / facebook / signup by email, signup by mobile
    profileidverification: { type: String }, //yes / no
    otpverify: { type: String }, //yes / no
    image: { type: String }, //Gender
    onlinestatus: { type: String },
    enteredby: { type: Date, default: Date.now },
    updateby: { type: Date, default: Date.now },
    xtime: { type: Date, default: Date.now },
    otpcode: { type: String },
    modulewiselogin: { type: [String] },
    mobileverify: { type: String, default: "Not Verify" },
    emailverify: { type: String, default: "Not Verify" },
    // Follow list: stores user IDs of followers & following
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    gallery: [{ type: String }],
    address: [AddressSchema],
    logs: { type: Object },
    coins: {
        type: Number,
        default: 0,
        min: 0 // prevents negative coins
    },
   referralCode: {
    type: String,
    unique: true,
   },
   referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  blockedUsers: [{
    type: mongoose.Schema.ObjectId,
    ref: "users"
  }],
  fcm_token: { type : String},
  fcm_tokens: { type: [String], default: [] },
  setting_user: { type : Object},
  /* --- Admin panel / moderation (Social Media module) --- */
  accountStatus: {
    type: String,
    // "deleted" is the reversible soft-delete state the admin panel writes;
    // a hard delete removes the document entirely.
    enum: ["active", "suspended", "banned", "deleted"],
    default: "active"
  },
  suspendedUntil: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  moderationNote: { type: String },
  verifiedBadge: { type: Boolean, default: false }, // blue tick
  accountType: {
    type: String,
    enum: ["personal", "creator", "business"],
    default: "personal"
  },
  /* --- Privacy Settings (public / private / custom) --- */
  privacy: {
    type: String,
    enum: ["public", "private", "custom"],
    default: "public"
  },
  // Only consulted when privacy === "custom". For "public" and "private" the
  // presets in helpers/privacy.js are used instead, so switching modes never
  // loses the user's custom choices.
  privacySettings: { type: PrivacySettingsSchema, default: () => ({}) },

  /* --- Engagement: notification preferences and tag review --- */
  notificationPrefs: { type: NotificationPrefsSchema, default: () => ({}) },
  // When true, tags of this user stay unapproved until they accept, so the
  // post never shows on their tagged feed without consent.
  tagReview: { type: Boolean, default: false },
  // Pending follow requests waiting on this user's approval (private accounts)
  followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  // Requests this user has sent that are still pending
  sentFollowRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  // Users allowed extra access under "custom" (close-friends style allow list)
  closeFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0]
      }
  },

  /* --- Profile: interests & hobbies --- */
  /*
    Multi-select interests. The legacy `interest` String above is kept in sync
    with the first entry so the old signup picker and /apis/auth/update-interest
    keep working; nothing reads it as the source of truth any more.
  */
  interests: { type: [String], default: [] },

  /* --- Discovery & Search --- */
  // Hashtags this user follows, so their topics can feed a discovery rail.
  followedHashtags: { type: [String], default: [], lowercase: true },
  // Free-text topics/city the creator wants to be discovered under.
  discoveryTopics: { type: [String], default: [] },
  city: { type: String, trim: true },
  country: { type: String, trim: true }
});

/*
  Geospatial index for nearby-creator discovery. Documents with no `location`
  are simply not indexed, which is the common case here — but note the schema
  default above writes [0, 0] whenever a location object IS created, and that
  is a real point in the Gulf of Guinea. Every geo query in the discovery
  controller therefore excludes [0, 0] explicitly rather than trusting the
  index, or every such account reads as "near" anyone searching from there.
*/
userSchema.index({ location: "2dsphere" });
userSchema.index({ followedHashtags: 1 });
userSchema.index({ accountType: 1, verifiedBadge: -1 });

const User = mongoose.model('users', userSchema);

export default User;  // Default export

