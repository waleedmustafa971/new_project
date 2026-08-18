/*
  Deletes everything seed-demo.mjs created. Touches nothing else: every record
  is found by walking out from the @demo.superapp.local users.

  Run from the backend directory:  node <path>/remove-demo.mjs
*/
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;

const users = await db.collection("users")
  .find({ email: /@demo\.superapp\.local$/ })
  .project({ _id: 1 })
  .toArray();

const ids = users.map((u) => u._id);
const strIds = ids.map(String);

if (ids.length === 0) {
  console.log("no demo data found — nothing to remove");
} else {
  const r = {
    reels:         (await db.collection("reels").deleteMany({ username: { $in: ids } })).deletedCount,
    groups:        (await db.collection("socialgroups").deleteMany({ creator: { $in: ids } })).deletedCount,
    reports:       (await db.collection("reports").deleteMany({ $or: [{ reporter: { $in: ids } }, { targetUser: { $in: ids } }] })).deletedCount,
    verifications: (await db.collection("verifications").deleteMany({ userid: { $in: strIds } })).deletedCount,
    livestreams:   (await db.collection("livestreamtbls").deleteMany({ hoster: { $in: ids } })).deletedCount,
    users:         (await db.collection("users").deleteMany({ _id: { $in: ids } })).deletedCount,
  };
  console.log("removed:", r);
}

console.log("users remaining in database:", await db.collection("users").countDocuments());
await mongoose.disconnect();
