/*
  End-to-end HTTP suite for the Monetisation section (/apis/monetisation).

  Covers all five sheet rows: verified coin purchase, virtual items, paid
  subscription tiers, the creator earnings ledger with payouts, and live-stream
  gifting — which was already shipped and is exercised here for the earnings
  hook it now feeds.

  The purchase tests drive Stripe in test mode for real: the suite creates a
  PaymentIntent through the API, pays it with the `pm_card_visa` test method,
  then confirms it. That leaves test-mode objects in the Stripe account, which
  is the point — a purchase path that is only ever tested against a stub is a
  purchase path nobody has tested.

  Run from the backend directory, with the server already up:
    node scripts/test-monetisation.mjs
*/

const BASE = process.env.BASE || "http://localhost:5000/apis/monetisation";
const LIVE = process.env.LIVE_BASE || "http://localhost:5000/apis/live";

/* Demo fixtures. Chosen deliberately:
     CREATOR Layla  — already a `creator` account, so tiers need no mutation
     SUB1    Nadia  — 2100 coins, subscribes and gifts
     SUB2    Mariam — 640 coins, second subscriber
     BUYER   Ali    — 55 coins, too poor for the dearer item
     POOR    Hassan — 0 coins and a `personal` account: the 403 and the 402
     ADMIN   Omar   — decides payouts
*/
const U = {
  layla:  "6a830332316418fdbc512051",
  omar:   "6a830332316418fdbc512052",
  mariam: "6a830332316418fdbc512055",
  ali:    "6a830332316418fdbc512056",
  nadia:  "6a830332316418fdbc512057",
  hassan: "6a830332316418fdbc512058",
};

let pass = 0, failed = 0;
const failures = [];

const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else {
    failed++; failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
};

const request = (root) => async (method, path, { as, body, query } = {}) => {
  const url = new URL(root + path);
  if (as) url.searchParams.set("userId", as);
  for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);
  const hasBody = !["GET", "HEAD"].includes(method) && (body || as);
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: hasBody ? JSON.stringify({ userId: as, ...(body || {}) }) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  return { ...json, _http: res.status };
};
const call = request(BASE);
const live = request(LIVE);

const section = (t) => console.log(`\n${"=".repeat(66)}\n${t}\n${"=".repeat(66)}`);

/* Run from backend/, so resolve the project's own dependencies. */
const require = (await import("node:module")).createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
const Stripe = require("stripe");
require("dotenv").config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;
const OID = (v) => new mongoose.Types.ObjectId(String(v));

/* The key lives in .env, which is gitignored. Without it this suite cannot
   drive Stripe at all, so say so plainly rather than failing 40 checks. */
if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    "\n  STRIPE_SECRET_KEY is not set in backend/.env — this suite drives real" +
    "\n  test-mode Stripe calls and cannot run without it.\n"
  );
  process.exit(1);
}
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const TEST_TIER = "SUITE Inner Circle";
const TEST_ITEM_PREFIX = "SUITEITEM ";
const TEST_GIFT_PREFIX = "SUITEGIFT ";

const FIXTURES = Object.values(U);

const sweep = async () => {
  const ids = FIXTURES.map(OID);
  await db.collection("subscriptiontiers").deleteMany({ creator: { $in: ids } });
  await db.collection("subscriptions").deleteMany({ subscriber: { $in: ids } });
  await db.collection("earningsentries").deleteMany({ creator: { $in: ids } });
  await db.collection("payouts").deleteMany({ creator: { $in: ids } });
  await db.collection("coinpurchases").deleteMany({ user: { $in: ids } });
  await db.collection("owneditems").deleteMany({ user: { $in: ids } });
  await db.collection("virtualitems").deleteMany({ name: { $regex: `^${TEST_ITEM_PREFIX}` } });
  await db.collection("gifts").deleteMany({ name: { $regex: `^${TEST_GIFT_PREFIX}` } });
  await db.collection("depositscoins").deleteMany({ suiteFixture: true });
  const streams = await db.collection("livestreamtbls").find({ channelName: { $regex: /^live_/ } }).toArray();
  if (streams.length) {
    await db.collection("giftstransactions").deleteMany({ channelName: { $regex: /^live_/ } });
    await db.collection("livestreamtbls").deleteMany({ _id: { $in: streams.map((s) => s._id) } });
  }
  await db.collection("notifications").deleteMany({ type: { $in: ["subscription", "live_gift"] } });
};
await sweep();

const coinsBefore = Object.fromEntries(
  (await db.collection("users").find({ _id: { $in: FIXTURES.map(OID) } }, { projection: { coins: 1 } }).toArray())
    .map((u) => [String(u._id), u.coins || 0])
);

/*
  Put the coin balances back even if this run falls over.

  Two crashed runs in development drifted the demo data exactly this way: the
  suite died part-way, the cleanup at the bottom never ran, and the *next* run
  then snapshotted the already-wrong balances and faithfully restored those —
  so the drift looked like the baseline and survived. A crash must not be able
  to leave the owner's demo accounts holding coins they never had.
*/
let coinsRestored = false;
const restoreCoins = async () => {
  if (coinsRestored) return;
  coinsRestored = true;
  for (const [id, coins] of Object.entries(coinsBefore)) {
    await db.collection("users").updateOne({ _id: OID(id) }, { $set: { coins } });
  }
};
for (const event of ["uncaughtException", "unhandledRejection"]) {
  process.on(event, async (err) => {
    console.error(`\n  !! ${event} — restoring coin balances before exiting\n`, err);
    try { await restoreCoins(); } catch { /* nothing more we can do */ }
    process.exit(1);
  });
}

const baseline = {
  packages: await db.collection("depositscoins").countDocuments({}),
  purchases: await db.collection("coinpurchases").countDocuments({}),
  items: await db.collection("virtualitems").countDocuments({}),
  owned: await db.collection("owneditems").countDocuments({}),
  tiers: await db.collection("subscriptiontiers").countDocuments({}),
  subs: await db.collection("subscriptions").countDocuments({}),
  earnings: await db.collection("earningsentries").countDocuments({}),
  payouts: await db.collection("payouts").countDocuments({}),
  streams: await db.collection("livestreamtbls").countDocuments({}),
  gifts: await db.collection("gifts").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
};
console.log(`  baseline: ${baseline.streams} streams, ${baseline.notifications} notifications, ` +
            `all monetisation collections at ${baseline.tiers + baseline.subs + baseline.earnings + baseline.payouts}`);

/* The platform's cut, mirrored from helpers/monetisation.js so the suite can
   assert the split rather than trusting whatever the server returns. */
const FEE_RATE = Number(process.env.PLATFORM_FEE_RATE) >= 0 && Number(process.env.PLATFORM_FEE_RATE) < 1
  ? Number(process.env.PLATFORM_FEE_RATE) : 0.3;
const split = (gross) => {
  const fee = Math.round(gross * FEE_RATE);
  return { fee, net: gross - fee };
};

/*
  The payout minimum is 1000 coins, and the payout tests need to hold, release
  and settle several of those against one balance. The demo accounts do not
  carry enough for that, so the subscriber is topped up here — `coinsBefore` was
  snapshotted above, and cleanup puts every balance back exactly as found.
*/
await db.collection("users").updateOne({ _id: OID(U.nadia) }, { $set: { coins: 5000 } });

const created = { tierId: null, streamId: null, packageId: null, items: [], giftId: null };

/* ================================================================== */
section("1. In-App Coin Purchase (real Stripe test mode)");

/*
  `currency` is handed to Stripe, so it has to be a real one — it cannot double
  as the marker this suite sweeps on. `suiteFixture` does that job instead.
*/
const pack = await db.collection("depositscoins").insertOne({
  priceAED: 5, coins: 500, currency: "usd", status: "active", xtime: new Date(),
  suiteFixture: true,
});
created.packageId = String(pack.insertedId);

const packages = await call("GET", "/packages");
check("the coin packages list", packages.total === 1 && packages.packages[0].coins === 500);

const badIntent = await call("POST", "/purchase/intent", { as: U.ali, body: { packageId: U.layla } });
check("an unknown package is refused", badIntent._http === 404);

const intent = await call("POST", "/purchase/intent", { as: U.ali, body: { packageId: created.packageId } });
check("a purchase intent is created", !!intent.paymentIntentId && !!intent.clientSecret);
check("the amount comes from the package, not the client", intent.amount === 500);

const tooEarly = await call("POST", "/purchase/confirm", { as: U.ali, body: { paymentIntentId: intent.paymentIntentId } });
check("an unpaid intent credits nothing", tooEarly._http === 402, `got ${tooEarly._http}`);

// Act as the client's card sheet would.
await stripe.paymentIntents.confirm(intent.paymentIntentId, { payment_method: "pm_card_visa" });

const aliBefore = coinsBefore[U.ali];
const confirmed = await call("POST", "/purchase/confirm", { as: U.ali, body: { paymentIntentId: intent.paymentIntentId } });
check("a paid intent credits the coins", confirmed.success === true && confirmed.coinsAdded === 500,
  JSON.stringify(confirmed).slice(0, 140));
check("the wallet reflects the purchase", confirmed.coins === aliBefore + 500,
  `${aliBefore} -> ${confirmed.coins}`);

const replay = await call("POST", "/purchase/confirm", { as: U.ali, body: { paymentIntentId: intent.paymentIntentId } });
check("the same payment cannot be credited twice", replay._http === 409, `got ${replay._http}`);

const afterReplay = await call("GET", "/wallet", { as: U.ali });
check("the replay added nothing", afterReplay.coins === aliBefore + 500, `coins=${afterReplay.coins}`);

const stolen = await call("POST", "/purchase/confirm", { as: U.nadia, body: { paymentIntentId: intent.paymentIntentId } });
check("someone else's payment cannot be claimed", stolen._http === 403, `got ${stolen._http}`);

const fakeIntent = await call("POST", "/purchase/confirm", { as: U.ali, body: { paymentIntentId: "pi_does_not_exist" } });
check("an invented payment id is refused", fakeIntent._http === 404);

const history = await call("GET", "/purchase/history", { as: U.ali });
check("the purchase appears in history", history.total === 1 && history.purchases[0].coins === 500);

/* ================================================================== */
section("2. Gift Coins & Virtual Items");

const items = await db.collection("virtualitems").insertMany([
  { name: `${TEST_ITEM_PREFIX}Gold Frame`, kind: "frame", priceCoins: 100, active: true, createdAt: new Date() },
  { name: `${TEST_ITEM_PREFIX}Silver Frame`, kind: "frame", priceCoins: 200, active: true, createdAt: new Date() },
  { name: `${TEST_ITEM_PREFIX}Verified Badge`, kind: "badge", priceCoins: 50, active: true, createdAt: new Date() },
]);
const GOLD = String(items.insertedIds[0]);
const SILVER = String(items.insertedIds[1]);
const BADGE = String(items.insertedIds[2]);
created.items = Object.values(items.insertedIds);

const store = await call("GET", "/items", { as: U.ali });
check("the store lists items grouped by kind", store.byKind?.frame?.length === 2 && store.byKind?.badge?.length === 1);
check("nothing is marked owned yet", store.items.every((i) => i.owned === false));

const bought = await call("POST", `/items/${GOLD}/buy`, { as: U.ali });
check("an item can be bought", bought.success === true && bought.coinsSpent === 100);
check("the coins leave the wallet", bought.coins === aliBefore + 500 - 100, `coins=${bought.coins}`);

const boughtTwice = await call("POST", `/items/${GOLD}/buy`, { as: U.ali });
check("buying the same item twice is refused", boughtTwice._http === 409);

const tooPoor = await call("POST", `/items/${SILVER}/buy`, { as: U.hassan });
check("an item beyond the balance is refused", tooPoor._http === 402);

const storeAfter = await call("GET", "/items", { as: U.ali });
check("the store now marks the item owned", storeAfter.items.find((i) => i._id === GOLD)?.owned === true);

const mine = await call("GET", "/items/mine", { as: U.ali });
check("the inventory lists what was bought", mine.total === 1);

const equipNotOwned = await call("POST", `/items/${SILVER}/equip`, { as: U.ali });
check("an item you do not own cannot be equipped", equipNotOwned._http === 404);

const equipped = await call("POST", `/items/${GOLD}/equip`, { as: U.ali });
check("an owned item can be equipped", equipped.equipped === true);

await call("POST", `/items/${SILVER}/buy`, { as: U.ali });
const equipSecond = await call("POST", `/items/${SILVER}/equip`, { as: U.ali });
check("equipping a second frame works", equipSecond.equipped === true);

const wearing = await call("GET", "/items/mine", { as: U.ali });
const frames = wearing.items.filter((i) => i.kind === "frame" && i.equipped);
check("only one item per kind stays equipped", frames.length === 1, `${frames.length} frames equipped`);

await call("POST", `/items/${BADGE}/buy`, { as: U.ali });
await call("POST", `/items/${BADGE}/equip`, { as: U.ali });
const bothKinds = await call("GET", "/items/mine", { as: U.ali });
check("different kinds can be worn at once", bothKinds.equipped.length === 2);

const unequipped = await call("POST", `/items/${SILVER}/equip`, { as: U.ali, body: { equip: false } });
check("an item can be taken off", unequipped.equipped === false);

/* ================================================================== */
section("3. Paid Subscription Tiers");

const tierByPersonal = await call("POST", "/tiers", { as: U.hassan, body: { name: "Nope", priceCoins: 100 } });
check("a personal account cannot offer subscriptions", tierByPersonal._http === 403);

const badPrice = await call("POST", "/tiers", { as: U.layla, body: { name: TEST_TIER, priceCoins: 0 } });
check("a tier priced at zero is refused", badPrice._http === 422);

const tier = await call("POST", "/tiers", { as: U.layla, body: {
  name: TEST_TIER, priceCoins: 1500, description: "Behind the scenes", benefits: ["Early posts", "Q&A"],
} });
check("a creator can offer a tier", tier.success === true && !!tier.tier?._id);
created.tierId = tier.tier?._id;

const duplicate = await call("POST", "/tiers", { as: U.layla, body: { name: TEST_TIER, priceCoins: 500 } });
check("two tiers cannot share a name", duplicate._http === 409);

const publicTiers = await call("GET", `/tiers/${U.layla}`, { as: U.nadia });
check("the tier is visible to a would-be subscriber", publicTiers.total === 1);
check("a viewer is not shown as the owner", publicTiers.isOwner === false);

const editByOther = await call("PATCH", `/tiers/${created.tierId}`, { as: U.nadia, body: { priceCoins: 1 } });
check("only the creator can edit their tier", editByOther._http === 403);

const selfSub = await call("POST", "/subscribe", { as: U.layla, body: { tierId: created.tierId } });
check("a creator cannot subscribe to themselves", selfSub._http === 400);

const subscribed = await call("POST", "/subscribe", { as: U.nadia, body: { tierId: created.tierId } });
check("a subscription can be bought", subscribed.success === true && subscribed.coinsSpent === 1500);
check("the subscriber is debited", subscribed.coins === 5000 - 1500, `coins=${subscribed.coins}`);
check("the creator earns the net, not the gross", subscribed.creatorEarned === split(1500).net,
  `earned=${subscribed.creatorEarned}, expected=${split(1500).net}`);

const access = await call("GET", `/access/${U.layla}`, { as: U.nadia });
check("a subscriber has access", access.access === true && access.reason === "subscribed");

const noAccess = await call("GET", `/access/${U.layla}`, { as: U.mariam });
check("a non-subscriber does not", noAccess.access === false);

const ownAccess = await call("GET", `/access/${U.layla}`, { as: U.layla });
check("a creator always sees their own content", ownAccess.access === true);

const firstExpiry = new Date(subscribed.subscription.expiresAt);
const renewed = await call("POST", "/subscribe", { as: U.nadia, body: { tierId: created.tierId } });
check("renewing extends rather than restarts",
  new Date(renewed.subscription.expiresAt) > firstExpiry,
  `${firstExpiry.toISOString()} -> ${renewed.subscription?.expiresAt}`);
check("the renewal is counted", renewed.subscription?.renewals === 1);

const onlyOneRow = await db.collection("subscriptions").countDocuments({ subscriber: OID(U.nadia), creator: OID(U.layla) });
check("renewing does not create a second subscription row", onlyOneRow === 1, `${onlyOneRow} rows`);

const cannotAfford = await call("POST", "/subscribe", { as: U.hassan, body: { tierId: created.tierId } });
check("a subscription beyond the balance is refused", cannotAfford._http === 402);

const subscribers = await call("GET", "/subscribers", { as: U.layla });
check("the creator sees their subscriber", subscribers.total === 1);

const subs = await call("GET", "/subscriptions", { as: U.nadia });
check("the subscriber sees their subscription", subs.active === 1);

const cancelled = await call("POST", "/unsubscribe", { as: U.nadia, body: { creatorId: U.layla } });
check("a subscription can be cancelled", cancelled.success === true);

const accessAfterCancel = await call("GET", `/access/${U.layla}`, { as: U.nadia });
check("cancelling keeps access until the period ends", accessAfterCancel.access === true);

const cancelTwice = await call("POST", "/unsubscribe", { as: U.nadia, body: { creatorId: U.layla } });
check("cancelling twice is a 409", cancelTwice._http === 409);

await call("PATCH", `/tiers/${created.tierId}`, { as: U.layla, body: { active: false } });
const retired = await call("POST", "/subscribe", { as: U.mariam, body: { tierId: created.tierId } });
check("a retired tier cannot be subscribed to", retired._http === 409);
await call("PATCH", `/tiers/${created.tierId}`, { as: U.layla, body: { active: true } });

/* ================================================================== */
section("4. Live Stream Gifting feeding the earnings ledger");

const gift = await db.collection("gifts").insertOne({
  name: `${TEST_GIFT_PREFIX}Rose`, icon: "rose.png", coinCost: 600, groupname: "Basic",
});
created.giftId = gift.insertedId;

const stream = await live("POST", "/streams", { as: U.layla, body: { title: "Monetisation suite stream" } });
created.streamId = stream.stream?._id;
check("a stream can be started for the gifting test", !!created.streamId);

await live("POST", `/streams/${created.streamId}/join`, { as: U.mariam });
const sent = await live("POST", `/streams/${created.streamId}/gift`,
  { as: U.mariam, body: { giftId: String(created.giftId), quantity: 1 } });
check("a gift can be sent", sent.success === true && sent.coinsSpent === 600);
check("the host is paid the net of the platform fee", sent.hostEarned === split(600).net,
  `hostEarned=${sent.hostEarned}, expected=${split(600).net}`);
check("the platform fee is reported", sent.platformFee === split(600).fee);

const giftEntry = await db.collection("earningsentries").findOne({ creator: OID(U.layla), type: "gift" });
check("the gift wrote an earnings entry", !!giftEntry);
check("the entry's split adds up", giftEntry && giftEntry.grossCoins === giftEntry.feeCoins + giftEntry.netCoins,
  giftEntry ? `${giftEntry.grossCoins} vs ${giftEntry.feeCoins}+${giftEntry.netCoins}` : "");

await live("POST", `/streams/${created.streamId}/end`, { as: U.layla });

/* ================================================================== */
section("5. Creator Earnings System");

const earn = await call("GET", "/earnings", { as: U.layla });
const expectedNet = split(1500).net * 2 + split(600).net;   // two subscription periods + one gift
check("earnings total the ledger", earn.lifetimeNet === expectedNet,
  `lifetimeNet=${earn.lifetimeNet}, expected=${expectedNet}`);
check("gross, fee and net reconcile", earn.lifetimeGross === earn.lifetimeFee + earn.lifetimeNet,
  `${earn.lifetimeGross} vs ${earn.lifetimeFee}+${earn.lifetimeNet}`);
check("earnings are broken down by type", !!earn.byType?.subscription && !!earn.byType?.gift);
check("the whole balance is available before any payout", earn.available === expectedNet);

const statement = await call("GET", "/earnings/history", { as: U.layla });
check("the statement lists every entry", statement.total === 3, `total=${statement.total}`);

const filtered = await call("GET", "/earnings/history", { as: U.layla, query: { type: "gift" } });
check("the statement filters by type", filtered.total === 1);

const tooSmall = await call("POST", "/payouts", { as: U.layla, body: { coins: 10, destination: "IBAN123" } });
check("a payout below the minimum is refused", tooSmall._http === 422);

const noDestination = await call("POST", "/payouts", { as: U.layla, body: { coins: 1000 } });
check("a payout needs a destination", noDestination._http === 400);

const tooMuch = await call("POST", "/payouts", { as: U.layla, body: { coins: 999999, destination: "IBAN123" } });
check("a payout beyond the balance is refused", tooMuch._http === 402);

const payout = await call("POST", "/payouts", { as: U.layla, body: { coins: 1000, destination: "IBAN123" } });
check("a payout can be requested", payout.success === true && !!payout.payout?._id);
const PAYOUT = payout.payout?._id;
check("the payout is valued at the coin rate", payout.payout?.amount === Number((1000 * payout.payout.rate).toFixed(2)));

const heldEarn = await call("GET", "/earnings", { as: U.layla });
check("requested coins are held against the balance", heldEarn.available === expectedNet - 1000,
  `available=${heldEarn.available}`);
check("the held amount is reported", heldEarn.heldForPayout === 1000);

const doubleSpend = await call("POST", "/payouts", { as: U.layla, body: { coins: expectedNet, destination: "IBAN123" } });
check("the same balance cannot be requested twice", doubleSpend._http === 402, `got ${doubleSpend._http}`);

const cancelledPayout = await call("POST", `/payouts/${PAYOUT}/cancel`, { as: U.layla });
check("a pending request can be withdrawn", cancelledPayout.success === true);

const releasedEarn = await call("GET", "/earnings", { as: U.layla });
check("withdrawing releases the hold", releasedEarn.available === expectedNet, `available=${releasedEarn.available}`);

const payout2 = await call("POST", "/payouts", { as: U.layla, body: { coins: 1000, destination: "IBAN456" } });
const PAYOUT2 = payout2.payout?._id;

const notMine = await call("POST", `/payouts/${PAYOUT2}/cancel`, { as: U.nadia });
check("someone else cannot withdraw your payout request", notMine._http === 403);

const queue = await call("GET", "/admin/payouts", { as: U.omar, query: { status: "requested" } });
check("the admin queue lists the request", queue.pendingCount === 1 && queue.pendingCoins === 1000);

const payBeforeApprove = await call("POST", `/admin/payouts/${PAYOUT2}`, { as: U.omar, body: { action: "pay" } });
check("a request cannot be paid before it is approved", payBeforeApprove._http === 409);

const approved = await call("POST", `/admin/payouts/${PAYOUT2}`, { as: U.omar, body: { action: "approve" } });
check("an admin can approve a payout", approved.payout?.status === "approved");

const stillHeld = await call("GET", "/earnings", { as: U.layla });
check("approval keeps the coins held", stillHeld.available === expectedNet - 1000);

const paid = await call("POST", `/admin/payouts/${PAYOUT2}`, { as: U.omar, body: { action: "pay", reference: "TRX-1" } });
check("an admin can mark it paid", paid.payout?.status === "paid");

const afterPaid = await call("GET", "/earnings", { as: U.layla });
check("a paid payout stays deducted", afterPaid.available === expectedNet - 1000);
check("paid-out coins are reported", afterPaid.paidOut === 1000);

const decideAgain = await call("POST", `/admin/payouts/${PAYOUT2}`, { as: U.omar, body: { action: "reject" } });
check("a settled payout cannot be decided again", decideAgain._http === 409);

const payout3 = await call("POST", "/payouts", { as: U.layla, body: { coins: 1000, destination: "IBAN789" } });
const rejected = await call("POST", `/admin/payouts/${payout3.payout?._id}`,
  { as: U.omar, body: { action: "reject", note: "Details do not match" } });
check("an admin can reject a payout", rejected.payout?.status === "rejected");

const afterReject = await call("GET", "/earnings", { as: U.layla });
check("rejection releases the hold", afterReject.available === expectedNet - 1000,
  `available=${afterReject.available}`);

const noNote = await call("POST", "/admin/earnings/adjust", { as: U.omar, body: { creatorId: U.layla, coins: 50 } });
check("a ledger adjustment needs a note", noNote._http === 400);

const zeroAdjust = await call("POST", "/admin/earnings/adjust",
  { as: U.omar, body: { creatorId: U.layla, coins: 0, note: "nothing" } });
check("a zero adjustment is refused", zeroAdjust._http === 422);

const adjusted = await call("POST", "/admin/earnings/adjust",
  { as: U.omar, body: { creatorId: U.layla, coins: 500, note: "Goodwill credit" } });
check("an admin can credit the ledger", adjusted.success === true);
check("the adjustment lands in the balance", adjusted.available === expectedNet - 1000 + 500,
  `available=${adjusted.available}`);

const clawback = await call("POST", "/admin/earnings/adjust",
  { as: U.omar, body: { creatorId: U.layla, coins: -500, note: "Reversing the goodwill credit" } });
check("an adjustment can be negative", clawback.available === expectedNet - 1000,
  `available=${clawback.available}`);

const noFeeOnAdjust = await db.collection("earningsentries").findOne({ creator: OID(U.layla), type: "adjustment" });
check("an adjustment takes no platform fee", noFeeOnAdjust?.feeCoins === 0);

/* ================================================================== */
section("Cleanup");

const ids = FIXTURES.map(OID);
const delTiers = await db.collection("subscriptiontiers").deleteMany({ creator: { $in: ids } });
const delSubs = await db.collection("subscriptions").deleteMany({ subscriber: { $in: ids } });
const delEarn = await db.collection("earningsentries").deleteMany({ creator: { $in: ids } });
const delPayouts = await db.collection("payouts").deleteMany({ creator: { $in: ids } });
const delPurchases = await db.collection("coinpurchases").deleteMany({ user: { $in: ids } });
const delOwned = await db.collection("owneditems").deleteMany({ user: { $in: ids } });
const delItems = await db.collection("virtualitems").deleteMany({ _id: { $in: created.items } });
const delGifts = await db.collection("gifts").deleteMany({ _id: created.giftId });
const delPack = await db.collection("depositscoins").deleteMany({ suiteFixture: true });
const delTx = await db.collection("giftstransactions").deleteMany({ channelName: { $regex: /^live_/ } });
const delStreams = await db.collection("livestreamtbls").deleteMany({ channelName: { $regex: /^live_/ } });
const delNotifs = await db.collection("notifications").deleteMany({ type: { $in: ["subscription", "live_gift"] } });

console.log(`  removed ${delTiers.deletedCount} tiers, ${delSubs.deletedCount} subscriptions, ` +
            `${delEarn.deletedCount} ledger rows, ${delPayouts.deletedCount} payouts, ` +
            `${delPurchases.deletedCount} purchases, ${delOwned.deletedCount} owned items, ` +
            `${delItems.deletedCount} items, ${delGifts.deletedCount} gifts, ${delPack.deletedCount} packages, ` +
            `${delStreams.deletedCount} streams, ${delTx.deletedCount} gift transactions, ` +
            `${delNotifs.deletedCount} notifications`);

/* Coins moved for real throughout — buying, subscribing, gifting. Put them back. */
await restoreCoins();
const coinsAfter = Object.fromEntries(
  (await db.collection("users").find({ _id: { $in: ids } }, { projection: { coins: 1 } }).toArray())
    .map((u) => [String(u._id), u.coins || 0])
);
check("every demo coin balance is back to where it started",
  FIXTURES.every((id) => coinsAfter[id] === coinsBefore[id]), JSON.stringify(coinsAfter));

const after = {
  packages: await db.collection("depositscoins").countDocuments({}),
  purchases: await db.collection("coinpurchases").countDocuments({}),
  items: await db.collection("virtualitems").countDocuments({}),
  owned: await db.collection("owneditems").countDocuments({}),
  tiers: await db.collection("subscriptiontiers").countDocuments({}),
  subs: await db.collection("subscriptions").countDocuments({}),
  earnings: await db.collection("earningsentries").countDocuments({}),
  payouts: await db.collection("payouts").countDocuments({}),
  streams: await db.collection("livestreamtbls").countDocuments({}),
  gifts: await db.collection("gifts").countDocuments({}),
  notifications: await db.collection("notifications").countDocuments({}),
};
for (const key of Object.keys(baseline)) {
  check(`${key} restored to baseline (${baseline[key]})`, after[key] === baseline[key], `now ${after[key]}`);
}

await mongoose.disconnect();

/* ================================================================== */
console.log(`\n${"=".repeat(66)}`);
console.log(`  ${pass} passed, ${failed} failed`);
if (failures.length) console.log(`\n  Failing checks:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log("=".repeat(66));
process.exitCode = failed ? 1 : 0;
