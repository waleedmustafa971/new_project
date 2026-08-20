/*
  Seeds the admin panel's Monetisation and Ads & Promotions screens with
  workable data: a gift catalogue, gift activity, coin purchases and a set of
  promo codes.

  The point is that an admin opening those screens has real rows to edit,
  filter, deactivate and sort, instead of four empty tables and a "create your
  first…" prompt. Coin packages are seeded separately and are left alone here if
  they already exist.

  Everything written carries `demoSeed: true`, which is what `--undo` sweeps.
  Inserts go through the driver rather than the Mongoose models precisely so
  that marker survives — the schemas would strip an unknown field.

  Two collisions with the test suites are deliberately avoided, because both
  sweep on patterns rather than on their own ids:

    - gift names never start with "TESTGIFT " or "SUITEGIFT "
    - gift-activity channel names never start with "live_"

  Using either would mean a test run silently deleting this data.

  Usage:
    node scripts/seed-monetisation.mjs           # create (idempotent)
    node scripts/seed-monetisation.mjs --undo    # remove everything it created
*/

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const UNDO = process.argv.includes("--undo");
const MARK = { demoSeed: true };
const CHANNEL_PREFIX = "demo_stream_";

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const say = (label, n) => console.log(`  ${String(n).padStart(4)}  ${label}`);

/* ------------------------------------------------------------------ */
/* undo                                                                */
/* ------------------------------------------------------------------ */

if (UNDO) {
  console.log("Removing seeded monetisation data\n");
  for (const c of ["gifts", "giftstransactions", "transactions", "promos", "depositscoins"]) {
    const r = await db.collection(c).deleteMany(MARK);
    say(c, r.deletedCount);
  }
  await mongoose.disconnect();
  console.log("\nDone. Nothing else was touched.");
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* who the activity belongs to                                         */
/* ------------------------------------------------------------------ */

const users = await db
  .collection("users")
  .find({ email: /@demo\.superapp\.local$/ })
  .project({ _id: 1, name: 1 })
  .toArray();

if (users.length < 4) {
  console.error("Need the demo users first — run: node scripts/seed-demo.mjs");
  await mongoose.disconnect();
  process.exit(1);
}
console.log(`Seeding against ${users.length} demo users\n`);

const pick = (arr, i) => arr[i % arr.length];
const daysAgo = (d, hour = 12) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, (d * 7) % 60, 0, 0);
  return t;
};

/* ------------------------------------------------------------------ */
/* 1. gift catalogue                                                   */
/* ------------------------------------------------------------------ */

/*
  Four price tiers, because the catalogue screen groups by `groupname` and a
  single flat tier makes the grouping look broken. Icons are named after the
  gift rather than left blank: the panel falls back to a placeholder when the
  file is missing, so these read correctly now and start working the moment
  real artwork is dropped into uploads/gifts/.
*/
const GIFTS = [
  ["Basic", "Clap", 5], ["Basic", "Rose", 10], ["Basic", "Heart", 20], ["Basic", "Ice Cream", 35],
  ["Popular", "Teddy Bear", 100], ["Popular", "Birthday Cake", 150], ["Popular", "Perfume", 250], ["Popular", "Bouquet", 300],
  ["Premium", "Fireworks", 500], ["Premium", "Rocket", 750], ["Premium", "Diamond", 1000],
  ["Luxury", "Sports Car", 2500], ["Luxury", "Crown", 5000], ["Luxury", "Private Yacht", 10000],
];

const existingGifts = await db.collection("gifts").countDocuments(MARK);
if (!existingGifts) {
  await db.collection("gifts").insertMany(
    GIFTS.map(([groupname, name, coinCost]) => ({
      groupname,
      name,
      icon: `uploads/gifts/${name.toLowerCase().replace(/ /g, "-")}.png`,
      coinCost,
      xtime: daysAgo(60),
      ...MARK,
    })),
    { ordered: false }
  ).catch((e) => {
    // A name clash with a gift that already exists is not worth aborting over.
    if (e.code !== 11000) throw e;
  });
}
const gifts = await db.collection("gifts").find(MARK).toArray();
say("gifts in catalogue", gifts.length);

/* ------------------------------------------------------------------ */
/* 2. gift activity                                                    */
/* ------------------------------------------------------------------ */

/*
  Weighted towards the cheap gifts, the way real activity is: a long tail of
  roses and a handful of crowns. Spread across 30 days so the screen has
  something to sort and filter by date.
*/
if (!(await db.collection("giftstransactions").countDocuments(MARK))) {
  const cheap = gifts.filter((g) => g.coinCost <= 300);
  const dear = gifts.filter((g) => g.coinCost > 300);
  const rows = [];

  for (let i = 0; i < 48; i++) {
    const gift = i % 7 === 0 ? pick(dear, i) : pick(cheap, i * 3);
    const sender = pick(users, i);
    let receiver = pick(users, i + 1 + (i % 3));
    if (String(receiver._id) === String(sender._id)) receiver = pick(users, i + 2);

    rows.push({
      sender: sender._id,
      receiver: receiver._id,
      gift: gift._id,
      channelName: `${CHANNEL_PREFIX}${String((i % 6) + 1).padStart(2, "0")}`,
      coins: gift.coinCost,
      createdAt: daysAgo(Math.floor(i / 2), 9 + (i % 12)),
      ...MARK,
    });
  }
  await db.collection("giftstransactions").insertMany(rows);
}
const giftTx = await db.collection("giftstransactions").countDocuments(MARK);
const giftCoins = await db.collection("giftstransactions")
  .aggregate([{ $match: MARK }, { $group: { _id: null, c: { $sum: "$coins" } } }]).toArray();
say(`gift activity rows (${giftCoins[0]?.c || 0} coins)`, giftTx);

/* ------------------------------------------------------------------ */
/* 3. purchases                                                        */
/* ------------------------------------------------------------------ */

/*
  The Purchases screen reads the `transactions` collection and sums the
  approved rows, so a realistic mix needs a few pending and failed ones too —
  otherwise the status filter has nothing to filter and the totals cannot be
  sanity-checked against the row list.

  Amounts are whole-currency here, not the smallest unit: that is what the
  legacy Transaction schema stores and what the panel displays.
*/
const PACKS = await db.collection("depositscoins").find({}).sort({ priceAED: 1 }).toArray();
if (PACKS.length && !(await db.collection("transactions").countDocuments(MARK))) {
  const methods = ["card", "googlepay", "applepay"];
  const rows = [];

  for (let i = 0; i < 36; i++) {
    const pack = pick(PACKS, i * 2);
    // Roughly one in nine does not complete, which is a believable mix.
    const status = i % 9 === 4 ? "pending" : i % 9 === 7 ? "failed" : "approved";
    rows.push({
      userId: pick(users, i)._id,
      paymentType: pick(methods, i),
      currency: (pack.currency || "aed").toUpperCase(),
      amount: pack.priceAED,
      coins: pack.coins,
      paymentStatus: status,
      date: daysAgo(Math.floor(i / 1.5), 8 + (i % 14)),
      ...MARK,
    });
  }
  await db.collection("transactions").insertMany(rows);
}
const txCount = await db.collection("transactions").countDocuments(MARK);
const txSum = await db.collection("transactions")
  .aggregate([{ $match: { ...MARK, paymentStatus: "approved" } },
              { $group: { _id: null, a: { $sum: "$amount" }, c: { $sum: "$coins" } } }]).toArray();
say(`purchases (${txSum[0]?.a || 0} AED approved, ${txSum[0]?.c || 0} coins)`, txCount);

/* ------------------------------------------------------------------ */
/* 4. promo codes and campaigns                                        */
/* ------------------------------------------------------------------ */

/*
  A spread that exercises every branch of the promo form: percentage and fixed
  amount, capped and uncapped, repeatable and single-use, cashback, active and
  expired, and one scheduled to start in the future. An admin editing these
  learns the shape of the form faster than from an empty create screen.
*/
const PROMOS = [
  { promo_code: "WELCOME50", message: "50% off your first coin purchase", discount: 50,
    discount_type: "percentage", max_discount_amount: 25, minimum_order_amount: 10,
    from: -45, to: 45, no_of_users: 500, repeat_usage: false, modulename: "shopping" },

  { promo_code: "COINS20", message: "20 AED off any coin package", discount: 20,
    discount_type: "amount", minimum_order_amount: 50, from: -20, to: 40,
    no_of_users: 250, repeat_usage: true, no_of_repeat_usage: 3, modulename: "shopping" },

  { promo_code: "RAMADAN25", message: "Ramadan special — 25% off", discount: 25,
    discount_type: "percentage", max_discount_amount: 60, minimum_order_amount: 100,
    from: -120, to: -60, no_of_users: 1000, repeat_usage: false, modulename: "shopping",
    status: false },

  { promo_code: "CASHBACK10", message: "10% back in coins", discount: 10,
    discount_type: "percentage", max_discount_amount: 30, minimum_order_amount: 50,
    from: -10, to: 60, no_of_users: 300, repeat_usage: true, no_of_repeat_usage: 5,
    is_cashback: true, modulename: "shopping" },

  { promo_code: "CREATOR100", message: "100 AED off for verified creators", discount: 100,
    discount_type: "amount", minimum_order_amount: 250, from: -5, to: 90,
    no_of_users: 50, repeat_usage: false, modulename: "shopping" },

  { promo_code: "SUMMERSALE", message: "Summer campaign — starts next month", discount: 30,
    discount_type: "percentage", max_discount_amount: 75, minimum_order_amount: 100,
    from: 30, to: 90, no_of_users: 750, repeat_usage: false, modulename: "shopping" },

  { promo_code: "FOOD15", message: "15% off food orders", discount: 15,
    discount_type: "percentage", max_discount_amount: 20, minimum_order_amount: 30,
    from: -15, to: 30, no_of_users: 400, repeat_usage: true, no_of_repeat_usage: 2,
    modulename: "food" },

  { promo_code: "EXPIRED5", message: "Old launch offer", discount: 5,
    discount_type: "amount", minimum_order_amount: 20, from: -200, to: -170,
    no_of_users: 100, repeat_usage: false, modulename: "shopping", status: false },
];

if (!(await db.collection("promos").countDocuments(MARK))) {
  await db.collection("promos").insertMany(
    PROMOS.map((p) => {
      const { from, to, ...rest } = p;
      return {
        message: "", no_of_users: 0, minimum_order_amount: 0, repeat_usage: false,
        no_of_repeat_usage: 0, image: "", status: true, is_cashback: false,
        list_promocode: true, modulename: "shopping",
        ...rest,
        start_date: daysAgo(-from),
        end_date: daysAgo(-to),
        xtime: daysAgo(60),
        ...MARK,
      };
    }),
    { ordered: false }
  ).catch((e) => { if (e.code !== 11000) throw e; });
}
const promoCount = await db.collection("promos").countDocuments(MARK);
const promoLive = await db.collection("promos").countDocuments({ ...MARK, status: true });
say(`promo codes (${promoLive} active)`, promoCount);

await mongoose.disconnect();
console.log("\nAll of it is marked demoSeed:true — remove with --undo.");
