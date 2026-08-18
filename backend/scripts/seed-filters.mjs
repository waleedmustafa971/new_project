/*
  Seeds the camera filter / beauty effect catalogue.

  The catalogue is the backend half of "Camera Filters & Beauty Effects" — the
  effects themselves run on the device, but the capture screen has nothing to
  show until this table has rows. Values are the defaults the client applies at
  full intensity; a user sliding the intensity control scales from here.

  Idempotent: upserts on `slug`, so re-running updates rather than duplicating.

    node scripts/seed-filters.mjs
    node scripts/seed-filters.mjs --reset   (drop the collection first)
*/

import mongoose from "mongoose";
import dotenv from "dotenv";
import Filter from "../models/Filter.js";

dotenv.config();

const COLOUR = [
  ["Original", "General", { }],
  ["Clarendon", "Vivid", { contrast: 1.2, saturation: 1.35, brightness: 1.05 }],
  ["Gingham", "Soft", { contrast: 0.9, saturation: 0.85, brightness: 1.05, temperature: -8 }],
  ["Juno", "Vivid", { contrast: 1.15, saturation: 1.4, temperature: 12 }],
  ["Lark", "Soft", { contrast: 0.95, saturation: 1.1, brightness: 1.12 }],
  ["Ludwig", "Soft", { contrast: 1.05, saturation: 0.9, brightness: 1.08 }],
  ["Valencia", "Warm", { contrast: 1.08, saturation: 1.15, temperature: 20, sepia: 0.15 }],
  ["Nashville", "Warm", { contrast: 1.2, saturation: 1.2, temperature: 28, sepia: 0.2 }],
  ["Sierra", "Warm", { contrast: 0.9, saturation: 1.1, temperature: 15, vignette: 0.3 }],
  ["Moon", "Mono", { grayscale: 1, contrast: 1.1, brightness: 1.05 }],
  ["Willow", "Mono", { grayscale: 1, contrast: 0.95, brightness: 1.1, sepia: 0.1 }],
  ["Inkwell", "Mono", { grayscale: 1, contrast: 1.25 }],
  ["Aden", "Cool", { saturation: 0.85, temperature: -15, brightness: 1.08 }],
  ["Reyes", "Cool", { contrast: 0.85, saturation: 0.75, brightness: 1.15, sepia: 0.22 }],
  ["Midnight", "Cool", { contrast: 1.3, saturation: 0.8, temperature: -25, vignette: 0.4 }],
];

const BEAUTY = [
  ["Natural", { smooth: 0.25, slim: 0.0,  brighten: 0.15, eyes: 0.1 }],
  ["Soft",    { smooth: 0.5,  slim: 0.1,  brighten: 0.3,  eyes: 0.2 }],
  ["Glow",    { smooth: 0.65, slim: 0.15, brighten: 0.5,  eyes: 0.3 }],
  ["Studio",  { smooth: 0.8,  slim: 0.25, brighten: 0.55, eyes: 0.4 }],
  ["Max",     { smooth: 1.0,  slim: 0.4,  brighten: 0.7,  eyes: 0.55 }],
];

const EFFECTS = [
  ["Bokeh", "Depth", { blurBackground: 0.6 }],
  ["Vignette", "Depth", { vignette: 0.5 }],
  ["Film Grain", "Texture", { grain: 0.35 }],
  ["Light Leak", "Texture", { leak: 0.4, temperature: 18 }],
  ["Glitch", "Motion", { glitch: 0.5 }],
  ["VHS", "Motion", { grain: 0.5, chromaticAberration: 0.4, scanlines: 0.6 }],
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const rows = [
  ...COLOUR.map(([name, category, params], i) => ({
    name, slug: slugify(name), kind: "filter", category, params,
    order: i, premium: false, status: "active",
    thumbnail: `/uploads/filters/${slugify(name)}.jpg`,
  })),
  ...BEAUTY.map(([name, params], i) => ({
    name, slug: `beauty-${slugify(name)}`, kind: "beauty", category: "Beauty",
    params, order: i, premium: name === "Max", status: "active",
    thumbnail: `/uploads/filters/beauty-${slugify(name)}.jpg`,
  })),
  ...EFFECTS.map(([name, category, params], i) => ({
    name, slug: slugify(name), kind: "effect", category, params,
    order: i, premium: ["Glitch", "VHS"].includes(name), status: "active",
    thumbnail: `/uploads/filters/${slugify(name)}.jpg`,
  })),
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (process.argv.includes("--reset")) {
    const { deletedCount } = await Filter.deleteMany({});
    console.log(`reset: removed ${deletedCount} existing filter(s)`);
  }

  const result = await Filter.bulkWrite(
    rows.map((r) => ({
      updateOne: {
        filter: { slug: r.slug },
        // usageCount is left alone on re-run — it is live data, not seed data.
        update: { $set: { ...r }, $setOnInsert: { usageCount: 0 } },
        upsert: true,
      },
    }))
  );

  console.log(`upserted ${result.upsertedCount}, updated ${result.modifiedCount}`);
  for (const kind of ["filter", "beauty", "effect"]) {
    console.log(`  ${kind}: ${await Filter.countDocuments({ kind })}`);
  }
  console.log(`total in catalogue: ${await Filter.countDocuments()}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
