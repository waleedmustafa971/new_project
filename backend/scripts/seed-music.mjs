/*
  Seeds the music library so the picker, trim and trending endpoints have
  something real to work against.

  Tracks point at audio files already sitting in /uploads. Any that are missing
  from disk are skipped rather than seeded as dead links, so this stays honest
  about what the server can actually stream.

  Idempotent: upserts on musicname.

    node scripts/seed-music.mjs
    node scripts/seed-music.mjs --reset
*/

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Music from "../models/Music.js";

dotenv.config();

const UPLOADS = path.join(process.cwd(), "uploads");

// Pair the audio files on disk with catalogue metadata. Durations are the
// nominal clip length used by the trim UI; the client corrects from the real
// file once it has loaded it.
const CATALOGUE = [
  { file: "1772044967509-sound.mp4", musicname: "Golden Hour",    artist: "Nadia Farouk", genre: "Chill",     duration: 30, featured: true },
  { file: "1772193148105-sound.mp4", musicname: "Desert Drive",   artist: "Omar Khalid",  genre: "Electronic", duration: 28 },
  { file: "1772193727626-sound.mp4", musicname: "Rooftop Nights", artist: "Layla Hassan", genre: "Pop",        duration: 32, featured: true },
  { file: "1772193951610-sound.mp4", musicname: "Slow Tide",      artist: "Yusuf Rahman", genre: "Ambient",    duration: 26 },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (process.argv.includes("--reset")) {
    const { deletedCount } = await Music.deleteMany({});
    console.log(`reset: removed ${deletedCount} existing track(s)`);
  }

  const present = [];
  for (const t of CATALOGUE) {
    if (fs.existsSync(path.join(UPLOADS, t.file))) present.push(t);
    else console.log(`skipped (file not on disk): ${t.file}`);
  }

  if (present.length === 0) {
    console.log("no audio files found in /uploads — nothing seeded");
    await mongoose.disconnect();
    return;
  }

  const result = await Music.bulkWrite(
    present.map((t) => ({
      updateOne: {
        filter: { musicname: t.musicname },
        update: {
          $set: {
            musicname: t.musicname,
            artist: t.artist,
            genre: t.genre,
            music_group: t.genre,
            duration: t.duration,
            musicfile: `/uploads/${t.file}`,
            musictype: "audio",
            status: "Active",
            featured: !!t.featured,
          },
          // usageCount is live data — never reset by a re-run.
          $setOnInsert: { usageCount: 0, xtime: new Date() },
        },
        upsert: true,
      },
    }))
  );

  console.log(`upserted ${result.upsertedCount}, updated ${result.modifiedCount}`);
  console.log(`total tracks: ${await Music.countDocuments()}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
