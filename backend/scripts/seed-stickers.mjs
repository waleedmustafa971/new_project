/*
  Seeds the sticker / GIF catalogue.

  The picker has nothing to show until this table has rows. Sticker artwork is
  a design deliverable, so these entries point at /uploads/stickers/<pack>/… —
  the metadata, search keywords and emoji mapping are real and usable now, and
  dropping the images in later needs no code change.

  Idempotent: upserts on slug, leaves usageCount alone.

    node scripts/seed-stickers.mjs
    node scripts/seed-stickers.mjs --reset
*/

import mongoose from "mongoose";
import dotenv from "dotenv";
import StickerPack from "../models/StickerPack.js";

dotenv.config();

// [id, emoji it stands for, search keywords]
const CLASSIC = [
  ["smile",     "😀", ["happy", "smile", "grin", "joy"]],
  ["laugh",     "😂", ["laugh", "lol", "funny", "haha", "tears"]],
  ["love",      "😍", ["love", "heart", "adore", "crush"]],
  ["wink",      "😉", ["wink", "flirt", "cheeky"]],
  ["cool",      "😎", ["cool", "sunglasses", "swag"]],
  ["think",     "🤔", ["think", "hmm", "wonder", "confused"]],
  ["cry",       "😭", ["cry", "sad", "tears", "upset"]],
  ["angry",     "😡", ["angry", "mad", "rage", "furious"]],
  ["shock",     "😱", ["shock", "scream", "surprise", "omg"]],
  ["sleep",     "😴", ["sleep", "tired", "bored", "zzz"]],
  ["clap",      "👏", ["clap", "applause", "bravo", "well done"]],
  ["thumbsup",  "👍", ["thumbs up", "ok", "yes", "agree", "like"]],
  ["thumbsdown","👎", ["thumbs down", "no", "disagree", "dislike"]],
  ["pray",      "🙏", ["pray", "thanks", "please", "grateful"]],
  ["fire",      "🔥", ["fire", "hot", "lit", "amazing"]],
  ["heart",     "❤️", ["heart", "love", "red"]],
  ["party",     "🎉", ["party", "celebrate", "congrats", "yay"]],
  ["ok",        "👌", ["ok", "perfect", "fine", "good"]],
];

const REACTIONS = [
  ["yes",      "✅", ["yes", "done", "correct", "tick"]],
  ["no",       "❌", ["no", "wrong", "cancel", "cross"]],
  ["wait",     "⏳", ["wait", "loading", "hold on", "soon"]],
  ["idea",     "💡", ["idea", "tip", "suggestion", "lightbulb"]],
  ["warning",  "⚠️", ["warning", "careful", "alert"]],
  ["question", "❓", ["question", "ask", "what", "help"]],
];

const GIFS = [
  ["nod",      "👍", ["nod", "yes", "agree", "approve"]],
  ["facepalm", "🤦", ["facepalm", "oh no", "embarrassed"]],
  ["dance",    "💃", ["dance", "party", "celebrate", "happy"]],
  ["wave",     "👋", ["wave", "hello", "hi", "bye", "goodbye"]],
  ["shrug",    "🤷", ["shrug", "dunno", "whatever", "no idea"]],
  ["clapping", "👏", ["clap", "applause", "well done"]],
];

const packs = [
  {
    name: "Classic", slug: "classic", kind: "sticker", author: "Super App",
    order: 0, thumbnail: "/uploads/stickers/classic/thumb.png",
    stickers: CLASSIC.map(([id, emoji, keywords]) => ({
      stickerId: id, emoji, keywords,
      url: `/uploads/stickers/classic/${id}.png`,
      animated: false, width: 512, height: 512,
    })),
  },
  {
    name: "Quick Reactions", slug: "quick-reactions", kind: "sticker", author: "Super App",
    order: 1, thumbnail: "/uploads/stickers/reactions/thumb.png",
    stickers: REACTIONS.map(([id, emoji, keywords]) => ({
      stickerId: id, emoji, keywords,
      url: `/uploads/stickers/reactions/${id}.png`,
      animated: false, width: 512, height: 512,
    })),
  },
  {
    name: "Animated", slug: "animated", kind: "gif", author: "Super App",
    order: 2, thumbnail: "/uploads/stickers/animated/thumb.gif",
    stickers: GIFS.map(([id, emoji, keywords]) => ({
      stickerId: id, emoji, keywords,
      url: `/uploads/stickers/animated/${id}.gif`,
      animated: true, width: 480, height: 480,
    })),
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (process.argv.includes("--reset")) {
    const { deletedCount } = await StickerPack.deleteMany({});
    console.log(`reset: removed ${deletedCount} pack(s)`);
  }

  const result = await StickerPack.bulkWrite(
    packs.map((p) => ({
      updateOne: {
        filter: { slug: p.slug },
        update: { $set: { ...p, status: "active" }, $setOnInsert: { usageCount: 0 } },
        upsert: true,
      },
    }))
  );

  console.log(`upserted ${result.upsertedCount}, updated ${result.modifiedCount}`);
  for (const p of await StickerPack.find().select("name kind stickers").lean()) {
    console.log(`  ${p.name} (${p.kind}): ${p.stickers.length} items`);
  }

  await mongoose.disconnect();
};

run().catch((err) => { console.error(err); process.exit(1); });
