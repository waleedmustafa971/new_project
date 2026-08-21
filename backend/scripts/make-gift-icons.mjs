import sharp from "sharp";
import fs from "fs";
import path from "path";

/*
  Draw the gift catalogue's icons.

  The seeded gifts point at uploads/gifts/<name>.png and those files were never
  created, so every icon in the live gift sheet 404'd and the app fell back to a
  placeholder. These are written to exactly the paths already in the database,
  so nothing has to be re-pointed.

  Glyphs are rendered as silhouettes in the tier's colour rather than as colour
  emoji: the renderer here has no colour-emoji font, and a single-colour set
  reads as a designed catalogue instead of fourteen mismatched pictures.
*/

const TIERS = {
  Basic:   { ink: "#2563EB", wash: "#E8EFFD" },
  Popular: { ink: "#0F9D8F", wash: "#E3F5F2" },
  Premium: { ink: "#C2740B", wash: "#FBF0DE" },
  Luxury:  { ink: "#B21E6B", wash: "#FBE6F0" },
};

const GIFTS = [
  ["clap.png",         "👏", "Basic"],
  ["rose.png",         "🌹", "Basic"],
  ["heart.png",        "❤",  "Basic"],
  ["ice-cream.png",    "🍦", "Basic"],
  ["teddy-bear.png",   "🐻", "Popular"],
  ["birthday-cake.png","🎂", "Popular"],
  ["perfume.png",      "🌸", "Popular"],
  ["bouquet.png",      "💐", "Popular"],
  ["fireworks.png",    "🎆", "Premium"],
  ["rocket.png",       "🚀", "Premium"],
  ["diamond.png",      "💎", "Premium"],
  ["sports-car.png",   "🚗", "Luxury"],
  ["crown.png",        "👑", "Luxury"],
  ["private-yacht.png","⛵", "Luxury"],
];

const SIZE = 128;
const dir = path.join(process.cwd(), "uploads", "gifts");
fs.mkdirSync(dir, { recursive: true });

const svg = (glyph, tier) => `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <circle cx="64" cy="64" r="62" fill="${tier.wash}"/>
  <circle cx="64" cy="64" r="62" fill="none" stroke="${tier.ink}" stroke-opacity="0.18" stroke-width="2"/>
  <text x="64" y="92" font-size="64" text-anchor="middle"
        font-family="Segoe UI Emoji, Segoe UI Symbol, Apple Color Emoji, sans-serif"
        fill="${tier.ink}">${glyph}</text>
</svg>`;

let written = 0;
for (const [file, glyph, tierName] of GIFTS) {
  const tier = TIERS[tierName];
  await sharp(Buffer.from(svg(glyph, tier)))
    .png()
    .toFile(path.join(dir, file));
  written++;
}
console.log(`wrote ${written} gift icons to uploads/gifts`);
