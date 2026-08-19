
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

  /* --- added with the Notifications section --- */
  messages:     { type: Boolean, default: true },
  // Off by default: being told every time someone watches a story is the
  // single noisiest thing a social app can do, and the people who want it
  // will go and switch it on.
  storyViews:   { type: Boolean, default: false },
  pages:        { type: Boolean, default: true },
  subscriptions:{ type: Boolean, default: true },
  security:     { type: Boolean, default: true },

  /*
    Quiet hours. Stored as minutes past local midnight so the comparison is
    integer arithmetic rather than date parsing, and `tzOffsetMinutes` is the
    viewer's own offset because the server's timezone is not theirs.

    A window that wraps midnight (22:00 to 07:00) is the normal case, not the
    exception, so the comparison below handles start > end deliberately.

    Quiet hours suppress the *push*, never the record: the notification list
    still fills, so nothing is lost — it simply does not buzz.
  */
  quietHours: {
    enabled:  { type: Boolean, default: false },
    start:    { type: Number, default: 22 * 60 },
    end:      { type: Number, default: 7 * 60 },
    tzOffsetMinutes: { type: Number, default: 0 },
  },
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

  /*
    Restricting is the quieter half of blocking.

    A block is mutual and obvious: neither side sees the other, and the person
    blocked can tell. Restricting is one-directional and deliberately invisible
    to the person restricted — they carry on commenting and messaging as though
    nothing changed, but their comments on your posts stay hidden until you
    approve them, their messages land in a request folder, and they no longer
    see your online status or read receipts. It exists for the case where
    blocking someone would itself cause trouble.
  */
  restrictedUsers: [{
    type: mongoose.Schema.ObjectId,
    ref: "users"
  }],

  /*
    Posts this user has hidden from their own feed ("not interested").

    Distinct from the admin `status: "hidden"` on the post itself, which hides
    it from everyone. This is per-viewer and affects nobody else's feed.
  */
  hiddenPosts: [{
    type: mongoose.Schema.ObjectId,
    ref: "Reels"
  }],

  /*
    Accounts whose notifications this user does not want.

    Distinct from blocking and from restricting: muted people keep their full
    relationship — their posts still appear, their messages still arrive — and
    only the notifications stop. It is the "I follow my sister, I do not need a
    buzz for all forty of her stories" case.
  */
  mutedNotificationsFrom: [{
    type: mongoose.Schema.ObjectId,
    ref: "users"
  }],

  /* Pages (creator/business accounts) this user asked to be notified about. */
  pageNotificationsFor: [{
    type: mongoose.Schema.ObjectId,
    ref: "users"
  }],
  /* --- Two-Factor Authentication (extra login security) --- */
  /*
    TOTP, not SMS: there is no working delivery transport on this server (no
    mail sender, no SMS gateway, and push is disabled for want of Firebase
    credentials), and an authenticator secret is exchanged once at enrolment
    rather than on every login.

    `secret` and `recoveryCodes` carry `select: false`. That is not decoration —
    the login handler returns the whole user document as `usersdata`, so a
    selectable secret would be handed to the client on every login and defeat
    the entire feature. Anything that genuinely needs them must ask for them by
    name via .select("+twoFactor.secret").
  */
  twoFactor: {
    enabled: { type: Boolean, default: false },
    method: { type: String, enum: ["totp"], default: "totp" },

    // The live secret, and the one staged by /setup but not yet confirmed by a
    // successful code. Enrolment never overwrites a working secret.
    secret: { type: String, select: false, default: null },
    pendingSecret: { type: String, select: false, default: null },

    enabledAt: { type: Date, default: null },

    /*
      The last TOTP step number accepted. A code stays valid for its whole ~30s
      window, so without this the same six digits can be replayed inside that
      window by anyone who saw them.
    */
    lastUsedStep: { type: Number, default: null, select: false },

    // Single-use fallbacks, bcrypt-hashed exactly like a password: the server
    // never holds a recovery code it could leak in plaintext.
    recoveryCodes: {
      type: [{
        codeHash: { type: String, required: true },
        usedAt: { type: Date, default: null },
      }],
      default: [],
      select: false,
    },
  },

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
  /*
    The professional profile that comes with a creator or business account.

    Kept beside `accountType` rather than inside it because it survives a
    downgrade: someone who switches back to a personal account and later
    upgrades again should not have to retype their category and contact
    details. `accountType` alone decides what they can currently do.
  */
  creatorProfile: {
    category: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    website: { type: String, default: "" },
    upgradedAt: { type: Date, default: null },
    previousType: { type: String, default: null },
  },

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

