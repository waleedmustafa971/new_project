/*
  Demo data seeder for the Social Media admin panel.

  Everything it creates is tagged: users get an @demo.superapp.local email, and
  all other records reference those users. remove-demo.mjs deletes the lot.

  Run from the backend directory:  node <path>/seed-demo.mjs
*/
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const DEMO_DOMAIN = "@demo.superapp.local";
const BACKEND = process.cwd();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const oid = (v) => new mongoose.Types.ObjectId(v);

// Reuse whatever real images are already in uploads/ so thumbnails render.
const pics = fs
  .readdirSync(path.join(BACKEND, "uploads"))
  .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
  .map((f) => `uploads/${f}`);
const pic = (i) => (pics.length ? pics[i % pics.length] : null);

/* wipe any previous demo run so this is idempotent */
const old = await db.collection("users").find({ email: new RegExp(`${DEMO_DOMAIN}$`) }).toArray();
const oldIds = old.map((u) => u._id);
if (oldIds.length) {
  await db.collection("reels").deleteMany({ username: { $in: oldIds } });
  await db.collection("socialgroups").deleteMany({ creator: { $in: oldIds } });
  await db.collection("reports").deleteMany({ $or: [{ reporter: { $in: oldIds } }, { targetUser: { $in: oldIds } }] });
  await db.collection("verifications").deleteMany({ userid: { $in: oldIds.map(String) } });
  await db.collection("livestreamtbls").deleteMany({ hoster: { $in: oldIds } });
  await db.collection("users").deleteMany({ _id: { $in: oldIds } });
  console.log(`cleared ${oldIds.length} users from a previous demo run`);
}

const pw = await bcrypt.hash("demo1234", 4);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const PEOPLE = [
  { name: "Layla Hassan",   bio: "Travel & food creator ✈️🍽️", privacy: "public",  verified: true,  type: "creator",  coins: 4200, when: 40 },
  { name: "Omar Khalid",    bio: "Street photography",          privacy: "public",  verified: false, type: "personal", coins: 320,  when: 32 },
  { name: "Sara Ahmed",     bio: "Fitness coach 💪",            privacy: "private", verified: true,  type: "creator",  coins: 1875, when: 26 },
  { name: "Yusuf Rahman",   bio: "Gamer / streamer",            privacy: "public",  verified: false, type: "personal", coins: 90,   when: 19 },
  { name: "Mariam Nasser",  bio: "Illustrator, Dubai",          privacy: "custom",  verified: false, type: "personal", coins: 640,  when: 14 },
  { name: "Ali Mansour",    bio: "Cars & motors 🏎️",            privacy: "public",  verified: false, type: "personal", coins: 55,   when: 9  },
  { name: "Nadia Farouk",   bio: "Beauty & lifestyle",          privacy: "public",  verified: false, type: "business", coins: 2100, when: 5  },
  { name: "Hassan Tariq",   bio: "New here 👋",                 privacy: "public",  verified: false, type: "personal", coins: 0,    when: 1  },
];

const users = PEOPLE.map((p, i) => ({
  _id: oid(),
  name: p.name,
  email: p.name.toLowerCase().replace(/[^a-z]/g, ".") + DEMO_DOMAIN,
  password: pw,
  bio: p.bio,
  image: pic(i),
  gender: i % 2 ? "Male" : "Female",
  mobileno: `+9715${String(10000000 + i * 137).slice(0, 8)}`,
  privacy: p.privacy,
  privacySettings: p.privacy === "custom"
    ? { posts: "everyone", stories: "closeFriends", messages: "followers", onlineStatus: "nobody", discoverable: true, readReceipts: false }
    : {},
  verifiedBadge: p.verified,
  accountType: p.type,
  accountStatus: "active",
  coins: p.coins,
  followers: [], following: [], blockedUsers: [],
  followRequests: [], sentFollowRequests: [], closeFriends: [],
  referralCode: `DEMO${i}${Date.now().toString().slice(-5)}`,
  enteredby: daysAgo(p.when),
  updateby: daysAgo(p.when),
  xtime: daysAgo(p.when),
}));

await db.collection("users").insertMany(users);
const U = Object.fromEntries(users.map((u) => [u.name.split(" ")[0], u._id]));

/* --- moderation states worth seeing --- */
await db.collection("users").updateOne({ _id: U.Yusuf }, { $set: { accountStatus: "suspended", suspendedUntil: new Date(Date.now() + 5 * 86400000), moderationNote: "Repeated spam comments" } });
await db.collection("users").updateOne({ _id: U.Hassan }, { $set: { accountStatus: "banned", moderationNote: "Impersonation account" } });

/* --- follow graph --- */
const follow = async (a, b) => {
  await db.collection("users").updateOne({ _id: a }, { $addToSet: { following: b } });
  await db.collection("users").updateOne({ _id: b }, { $addToSet: { followers: a } });
};
for (const f of [U.Omar, U.Yusuf, U.Mariam, U.Ali, U.Nadia]) await follow(f, U.Layla);
for (const f of [U.Omar, U.Nadia]) await follow(f, U.Sara);
await follow(U.Layla, U.Omar);
await follow(U.Mariam, U.Nadia);

/* Sara is private — give her a pending follow request to approve */
await db.collection("users").updateOne({ _id: U.Sara }, { $addToSet: { followRequests: U.Ali } });
await db.collection("users").updateOne({ _id: U.Ali }, { $addToSet: { sentFollowRequests: U.Sara } });

/* Mariam is custom mode — give her a close friend */
await db.collection("users").updateOne({ _id: U.Mariam }, { $addToSet: { closeFriends: U.Nadia } });

/* a block, so the safety screens have something real */
await db.collection("users").updateOne({ _id: U.Nadia }, { $addToSet: { blockedUsers: U.Hassan } });

/* --- content --- */
const CONTENT = [
  { u: U.Layla,  t: "Sunset over the desert 🌅 #travel #dubai",      type: "Post",  d: 12, likes: 5, comments: 3 },
  { u: U.Layla,  t: "Best shawarma in the city #food #dubai",        type: "Reel",  d: 9,  likes: 4, comments: 2 },
  { u: U.Omar,   t: "Morning light, old town #photography",          type: "Post",  d: 8,  likes: 3, comments: 1 },
  { u: U.Sara,   t: "5-minute warm up routine #fitness",             type: "Reel",  d: 7,  likes: 6, comments: 4 },
  { u: U.Mariam, t: "New print series in progress 🎨",               type: "Post",  d: 5,  likes: 2, comments: 1 },
  { u: U.Ali,    t: "Weekend drive #cars #motors",                   type: "Reel",  d: 4,  likes: 3, comments: 0 },
  { u: U.Nadia,  t: "Skincare routine, honest review",               type: "Post",  d: 3,  likes: 4, comments: 2 },
  { u: U.Layla,  t: "Behind the scenes today",                       type: "Story", d: 1,  likes: 1, comments: 0 },
  { u: U.Sara,   t: "Quick check-in from the gym",                   type: "Story", d: 1,  likes: 0, comments: 0 },
  { u: U.Yusuf,  t: "FREE COINS click my link!!! #giveaway",         type: "Post",  d: 2,  likes: 0, comments: 1, hidden: true },
  { u: U.Hassan, t: "Official account of a famous person, trust me", type: "Post",  d: 1,  likes: 0, comments: 0 },
];

const pool = users.map((u) => u._id);
const reels = CONTENT.map((c, i) => ({
  _id: oid(),
  videoUrl: { url: pic(i), type: c.type === "Reel" ? "video" : "image" },
  videoTitle: c.t,
  posttype: c.type,
  username: c.u,
  status: c.hidden ? "hidden" : "active",
  status_draft_publish: "Publish",
  location: ["Dubai, UAE", "Abu Dhabi, UAE", "Sharjah, UAE", ""][i % 4],
  likes:    Array.from({ length: c.likes },    (_, k) => ({ username: pool[(i + k) % pool.length], count: 1 })),
  comments: Array.from({ length: c.comments }, (_, k) => ({
    username: pool[(i + k + 2) % pool.length],
    message: ["Love this! 🔥", "Where is this?", "Amazing shot", "Following you now"][k % 4],
    timestamp: daysAgo(c.d - 0.2),
    likes: [], reply: [],
  })),
  dislikes: [], favorites: [], shares: [], savepost: [], sharepost: [], stars: [],
  xtime: daysAgo(c.d),
}));
await db.collection("reels").insertMany(reels);

/* --- verification requests: one of each status --- */
await db.collection("verifications").insertMany([
  {
    userid: String(U.Mariam), kind: "social",
    fullName: "Mariam Nasser Al Amiri", knownAs: "mariam.draws",
    category: "creator", country: "United Arab Emirates",
    idDocumentType: "passport",
    notes: "Illustrator with 40k followers across platforms. Featured in Gulf News last month.",
    referenceLinks: ["https://example.com/gulfnews-feature", "https://example.com/mariam-portfolio"],
    images: [{ slNo: 1, image: `/${pic(0)}` }, { slNo: 2, image: `/${pic(1)}` }],
    status: "pending", reviewNote: "", reviewedAt: null,
    createdBy: String(U.Mariam), createdAt: daysAgo(2),
  },
  {
    userid: String(U.Ali), kind: "social",
    fullName: "Ali Mansour", knownAs: "ali.drives",
    category: "public_figure", country: "United Arab Emirates",
    idDocumentType: "national_id",
    notes: "Motoring journalist.",
    referenceLinks: ["https://example.com/ali-column"],
    images: [{ slNo: 1, image: `/${pic(2)}` }],
    status: "pending", reviewNote: "", reviewedAt: null,
    createdBy: String(U.Ali), createdAt: daysAgo(1),
  },
  {
    userid: String(U.Layla), kind: "social",
    fullName: "Layla Hassan", knownAs: "laylatravels",
    category: "creator", country: "United Arab Emirates",
    idDocumentType: "passport",
    notes: "Travel creator, 120k followers.",
    referenceLinks: ["https://example.com/layla"],
    images: [{ slNo: 1, image: `/${pic(3)}` }],
    status: "approved", reviewNote: "Verified against passport and press coverage.",
    reviewedAt: daysAgo(20), createdBy: String(U.Layla), createdAt: daysAgo(22),
  },
  {
    userid: String(U.Hassan), kind: "social",
    fullName: "Hassan Tariq", knownAs: "the.real.celebrity",
    category: "public_figure", country: "United Arab Emirates",
    idDocumentType: "other",
    notes: "I am very famous please verify me",
    referenceLinks: [],
    images: [],
    status: "rejected", reviewNote: "No supporting documentation and the account impersonates a public figure.",
    reviewedAt: daysAgo(1), createdBy: String(U.Hassan), createdAt: daysAgo(3),
  },
  {
    userid: String(U.Nadia), kind: "business",
    companyName: "Nadia Beauty FZ-LLC", licenseNumber: "DED-884120", telephone: "+97145550101",
    images: [{ slNo: 1, image: `/${pic(1)}` }],
    status: "pending", createdBy: String(U.Nadia), createdAt: daysAgo(4),
  },
]);

/* --- reports queue --- */
const spamPost = reels.find((r) => r.videoTitle.includes("FREE COINS"));
const impersonation = reels.find((r) => r.videoTitle.includes("famous person"));
await db.collection("reports").insertMany([
  { reporter: U.Omar,   targetType: "post", targetId: spamPost._id,      targetUser: U.Yusuf,  reason: "spam",          details: "Posting fake giveaway links repeatedly", status: "pending",   actionTaken: "none", createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { reporter: U.Nadia,  targetType: "post", targetId: spamPost._id,      targetUser: U.Yusuf,  reason: "scam",          details: "Phishing link in the caption",           status: "pending",   actionTaken: "none", createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  { reporter: U.Layla,  targetType: "user", targetId: U.Hassan,          targetUser: U.Hassan, reason: "impersonation", details: "Claiming to be someone they are not",    status: "pending",   actionTaken: "none", createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { reporter: U.Mariam, targetType: "post", targetId: impersonation._id, targetUser: U.Hassan, reason: "impersonation", details: "Fake celebrity account",                 status: "reviewing", actionTaken: "none", createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { reporter: U.Ali,    targetType: "user", targetId: U.Yusuf,           targetUser: U.Yusuf,  reason: "harassment",    details: "Abusive replies",                        status: "resolved",  actionTaken: "user_suspended", adminNote: "Suspended 7 days", reviewedAt: daysAgo(3), createdAt: daysAgo(4), updatedAt: daysAgo(3) },
]);

/* --- a group and a live stream, so those screens aren't empty --- */
await db.collection("socialgroups").insertOne({
  name: "Dubai Photographers", logo: pic(2),
  description: "Share your best shots around the UAE. Be kind, credit others.",
  creator: U.Omar, admins: [U.Omar], members: [U.Omar, U.Layla, U.Mariam, U.Ali],
  pendingRequests: [U.Nadia, U.Yusuf], isPrivate: true, createdAt: daysAgo(15),
});
await db.collection("socialgroups").insertOne({
  name: "UAE Foodies", logo: pic(3),
  description: "Where to eat, what to order.",
  creator: U.Layla, admins: [U.Layla], members: [U.Layla, U.Omar, U.Nadia],
  pendingRequests: [], isPrivate: false, createdAt: daysAgo(11),
});

await db.collection("livestreamtbls").insertMany([
  { channelName: "layla-live-demo", hoster: U.Layla, title: "Cooking a Friday brunch 🍳", thumbnail: pic(0), location: "Dubai", status: "live",  viewers_count: 128, coins: 340, cohoster: [], messages: [{ userid: U.Omar, message: "Looks amazing!" }, { userid: U.Ali, message: "recipe please" }], request_boxes: 5, xtime: new Date(Date.now() - 1800000), enteredby: new Date(), updateby: new Date() },
  { channelName: "sara-live-demo",  hoster: U.Sara,  title: "Live workout Q&A",           thumbnail: pic(1), location: "Abu Dhabi", status: "ended", viewers_count: 0, coins: 95, cohoster: [], messages: [], request_boxes: 5, xtime: daysAgo(3), enteredby: daysAgo(3), updateby: daysAgo(3) },
]);

console.log(`
seeded:
  ${users.length} users        (1 suspended, 1 banned, 2 verified, 1 private, 1 custom-privacy)
  ${reels.length} content items (posts, reels, stories; 1 hidden)
  5 verification requests (2 pending social, 1 approved, 1 rejected, 1 pending business)
  5 reports              (3 pending, 1 reviewing, 1 resolved)
  2 groups               (1 private with 2 join requests)
  2 live streams         (1 live now)

demo accounts all use password: demo1234
remove everything with: node scripts/remove-demo.mjs
`);

await mongoose.disconnect();
