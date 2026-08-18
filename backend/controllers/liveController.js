/*
  Live Streaming API — Social Media module (Posting & Content Creation).

  Fills the gaps around the existing LiveStreamController, which can create a
  stream, hand out Agora tokens and file a co-host request, but has nowhere to
  answer one:

    Start a Live Stream ......... viewer join/leave, live counts, stream detail
    Co-Host a Live Stream ....... approve / reject / leave / remove, seat limit
    Viewers Join Live as a Guest  the same seat mechanics with role "guest"
    Send Gift Coins During Live . REST gifting, balances, history, leaderboard

  Gifting exists over socket in index.js. sendGift() here is the same rules as
  a plain request, so a client that is not holding a socket — or one retrying a
  gift the socket dropped — has a path that still debits exactly once.
*/

import mongoose from "mongoose";

import LiveStream from "../models/LiveStream.js";
import User from "../models/users.js";
import GiftModal from "../models/GiftModal.js";
import GiftTransaction from "../models/GiftTransaction.js";
import { isId, AUTHOR_FIELDS } from "../helpers/feed.js";
import { notify } from "../services/notificationService.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[live]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const paging = (req, def = 20) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const sameId = (a, b) => String(a) === String(b);

// How many people can share the broadcast at once, host excluded.
const SEAT_LIMIT = 4;

const activeSeats = (stream) =>
  (stream.cohoster || []).filter((c) => c.status === "approved");

const liveViewers = (stream) =>
  (stream.viewers || []).filter((v) => !v.leftAt);

const shapeSeat = (c) => ({
  _id: c._id,
  user: c.user && typeof c.user === "object"
    ? { _id: c.user._id, name: c.user.name, image: c.user.image, verifiedBadge: !!c.user.verifiedBadge }
    : { _id: c.user },
  role: c.role || "cohost",
  status: c.status,
  micOn: c.micOn !== false,
  videoOn: c.videoOn !== false,
  joinedAt: c.joinedAt,
  leftAt: c.leftAt,
});

const loadStream = async (id, populate = false) => {
  if (!isId(id)) return null;
  const q = LiveStream.findById(id);
  if (populate) {
    q.populate("hoster", AUTHOR_FIELDS)
     .populate("cohoster.user", "name image verifiedBadge")
     .populate("viewers.user", "name image verifiedBadge");
  }
  return q.lean();
};

/* ------------------------------------------------------------------ */
/* 1. Start a Live Stream — detail, viewers, counts                    */
/* ------------------------------------------------------------------ */

/*
  Everything a viewer entering a room needs in one call: the host, who holds a
  seat, the live head count and the running gift total.
*/
export const streamDetail = wrap(async (req, res) => {
  const viewerId = actorId(req);
  if (!isId(req.params.id)) return fail(res, 400, "Valid stream id is required");

  const stream = await loadStream(req.params.id, true);
  if (!stream) return fail(res, 404, "Stream not found");

  const seats = activeSeats(stream);
  const mySeat = viewerId ? (stream.cohoster || []).find((c) => sameId(c.user?._id || c.user, viewerId)) : null;

  ok(res, {
    stream: {
      _id: stream._id,
      channelName: stream.channelName,
      title: stream.title,
      thumbnail: stream.thumbnail,
      location: stream.location,
      status: stream.status,
      host: stream.hoster,
      startedAt: stream.enteredby,
      endedAt: stream.endedAt || null,
      viewers: liveViewers(stream).length,
      peakViewers: stream.peak_viewers || 0,
      giftCoins: stream.gift_coins || 0,
      seats: seats.map(shapeSeat),
      seatsFree: Math.max(SEAT_LIMIT - seats.length, 0),
      pendingRequests: (stream.cohoster || []).filter((c) => c.status === "requested").length,
      isHost: viewerId ? sameId(stream.hoster?._id || stream.hoster, viewerId) : false,
      mySeat: mySeat ? shapeSeat(mySeat) : null,
    },
  });
});

/*
  Viewer joins. Rows rather than a counter: a reconnect re-opens the viewer's
  existing row instead of adding a second one, so the count cannot drift upward
  on a flaky connection.
*/
export const joinStream = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");

  const stream = await LiveStream.findById(id).select("status viewers peak_viewers hoster").lean();
  if (!stream) return fail(res, 404, "Stream not found");
  if (stream.status !== "live") return fail(res, 409, "This stream has ended");

  const existing = (stream.viewers || []).find((v) => sameId(v.user, userId));
  if (existing) {
    await LiveStream.updateOne(
      { _id: id, "viewers.user": oid(userId) },
      { $set: { "viewers.$.leftAt": null, "viewers.$.joinedAt": new Date() } }
    );
  } else {
    await LiveStream.updateOne(
      { _id: id },
      { $push: { viewers: { user: oid(userId), joinedAt: new Date(), leftAt: null } } }
    );
  }

  const fresh = await LiveStream.findById(id).select("viewers peak_viewers").lean();
  const count = liveViewers(fresh).length;
  if (count > (fresh.peak_viewers || 0)) {
    await LiveStream.updateOne({ _id: id }, { $set: { peak_viewers: count, viewers_count: count } });
  } else {
    await LiveStream.updateOne({ _id: id }, { $set: { viewers_count: count } });
  }

  ok(res, { message: "Joined", viewers: count });
});

export const leaveStream = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");

  const r = await LiveStream.updateOne(
    { _id: id, "viewers.user": oid(userId), "viewers.leftAt": null },
    { $set: { "viewers.$.leftAt": new Date() } }
  );
  if (r.matchedCount === 0) return fail(res, 404, "You are not in this stream");

  const fresh = await LiveStream.findById(id).select("viewers").lean();
  const count = liveViewers(fresh).length;
  await LiveStream.updateOne({ _id: id }, { $set: { viewers_count: count } });

  ok(res, { message: "Left", viewers: count });
});

export const listViewers = wrap(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = paging(req);
  if (!isId(id)) return fail(res, 400, "Valid stream id is required");

  const stream = await LiveStream.findById(id).select("viewers")
    .populate("viewers.user", "name image verifiedBadge").lean();
  if (!stream) return fail(res, 404, "Stream not found");

  const rows = liveViewers(stream)
    .filter((v) => v.user)
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));

  ok(res, {
    page, limit, total: rows.length,
    viewers: rows.slice(skip, skip + limit).map((v) => ({
      _id: v.user._id, name: v.user.name, image: v.user.image,
      verifiedBadge: !!v.user.verifiedBadge, joinedAt: v.joinedAt,
    })),
  });
});

/*
  Ending a stream has to close the room out, not just flip a flag: viewers are
  marked gone and anyone holding a seat is released, or the next stream reads
  stale rows.
*/
export const endStream = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");

  const stream = await LiveStream.findById(id).select("hoster status").lean();
  if (!stream) return fail(res, 404, "Stream not found");
  if (!sameId(stream.hoster, userId)) return fail(res, 403, "Only the host can end this stream");
  if (stream.status === "ended") return fail(res, 409, "Stream already ended");

  const now = new Date();
  await LiveStream.updateOne({ _id: id }, {
    $set: {
      status: "ended", endedAt: now, viewers_count: 0,
      "viewers.$[v].leftAt": now,
      "cohoster.$[c].status": "left",
      "cohoster.$[c].leftAt": now,
    },
  }, {
    arrayFilters: [{ "v.leftAt": null }, { "c.status": "approved" }],
  });

  const fresh = await LiveStream.findById(id).select("peak_viewers gift_coins enteredby endedAt").lean();
  ok(res, {
    message: "Stream ended",
    summary: {
      peakViewers: fresh.peak_viewers || 0,
      giftCoins: fresh.gift_coins || 0,
      durationSeconds: Math.max(
        Math.round((new Date(fresh.endedAt) - new Date(fresh.enteredby)) / 1000), 0
      ),
    },
  });
});

/* ------------------------------------------------------------------ */
/* 2 + 3. Co-Host a Live Stream / Viewers Join Live as a Guest         */
/* ------------------------------------------------------------------ */

/*
  Ask for a seat. `role` separates the two features: "cohost" is a peer sharing
  the broadcast, "guest" is a viewer coming up briefly. The seat mechanics are
  identical, so they share one queue.
*/
export const requestSeat = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const role = req.body?.role === "guest" ? "guest" : "cohost";

  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");

  const stream = await LiveStream.findById(id).select("hoster status cohoster title channelName").lean();
  if (!stream) return fail(res, 404, "Stream not found");
  if (stream.status !== "live") return fail(res, 409, "This stream has ended");
  if (sameId(stream.hoster, userId)) return fail(res, 400, "You are hosting this stream");

  const existing = (stream.cohoster || []).find((c) => sameId(c.user, userId));
  if (existing?.status === "requested") return fail(res, 409, "Your request is already pending");
  if (existing?.status === "approved") return fail(res, 409, "You are already on this stream");

  if (existing) {
    // Previously rejected, left or removed — reopen the same row.
    await LiveStream.updateOne(
      { _id: id, "cohoster.user": oid(userId) },
      { $set: { "cohoster.$.status": "requested", "cohoster.$.role": role, "cohoster.$.leftAt": null } }
    );
  } else {
    await LiveStream.updateOne(
      { _id: id },
      { $push: { cohoster: { user: oid(userId), role, status: "requested", micOn: true, videoOn: true } } }
    );
  }

  await notify({
    recipient: stream.hoster, actor: userId, type: "live_request",
    preview: role === "guest" ? "wants to join your live as a guest" : "wants to co-host your live",
  });

  ok(res, { message: role === "guest" ? "Guest request sent" : "Co-host request sent", role, status: "requested" });
});

/* The host's pending queue. */
export const listSeatRequests = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");

  const stream = await LiveStream.findById(id).select("hoster cohoster")
    .populate("cohoster.user", "name image verifiedBadge").lean();
  if (!stream) return fail(res, 404, "Stream not found");
  if (!sameId(stream.hoster, userId)) return fail(res, 403, "Only the host can see requests");

  const rows = (stream.cohoster || []).filter((c) => c.status === "requested" && c.user);
  ok(res, {
    total: rows.length,
    seatsFree: Math.max(SEAT_LIMIT - activeSeats(stream).length, 0),
    requests: rows.map(shapeSeat),
  });
});

export const respondToSeat = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { targetId } = req.body || {};
  const action = String(req.body?.action || "").toLowerCase();

  if (!isId(id) || !isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid stream id, userId and targetId are required");
  }
  if (!["approve", "reject"].includes(action)) return fail(res, 400, "action must be approve or reject");

  const stream = await LiveStream.findById(id).select("hoster status cohoster channelName").lean();
  if (!stream) return fail(res, 404, "Stream not found");
  if (!sameId(stream.hoster, userId)) return fail(res, 403, "Only the host can answer requests");
  if (stream.status !== "live") return fail(res, 409, "This stream has ended");

  const seat = (stream.cohoster || []).find((c) => sameId(c.user, targetId) && c.status === "requested");
  if (!seat) return fail(res, 404, "No pending request from that user");

  if (action === "approve" && activeSeats(stream).length >= SEAT_LIMIT) {
    return fail(res, 409, `All ${SEAT_LIMIT} seats are taken`);
  }

  await LiveStream.updateOne(
    { _id: id, "cohoster.user": oid(targetId) },
    action === "approve"
      ? { $set: { "cohoster.$.status": "approved", "cohoster.$.joinedAt": new Date() } }
      : { $set: { "cohoster.$.status": "rejected" } }
  );

  const fresh = await LiveStream.findById(id).select("cohoster").lean();
  ok(res, {
    message: action === "approve" ? "Request approved" : "Request rejected",
    channelName: stream.channelName,
    seatsUsed: activeSeats(fresh).length,
    seatsFree: Math.max(SEAT_LIMIT - activeSeats(fresh).length, 0),
  });
});

/* Step down from a seat voluntarily. */
export const leaveSeat = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(id) || !isId(userId)) return fail(res, 400, "Valid stream id and userId are required");

  const r = await LiveStream.updateOne(
    { _id: id, cohoster: { $elemMatch: { user: oid(userId), status: "approved" } } },
    { $set: { "cohoster.$.status": "left", "cohoster.$.leftAt": new Date() } }
  );
  if (r.matchedCount === 0) return fail(res, 404, "You do not hold a seat on this stream");

  ok(res, { message: "You left the broadcast" });
});

/* Host removes someone from a seat. */
export const removeSeat = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { targetId } = req.body || {};

  if (!isId(id) || !isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid stream id, userId and targetId are required");
  }

  const stream = await LiveStream.findById(id).select("hoster cohoster").lean();
  if (!stream) return fail(res, 404, "Stream not found");
  if (!sameId(stream.hoster, userId)) return fail(res, 403, "Only the host can remove someone");

  const r = await LiveStream.updateOne(
    { _id: id, cohoster: { $elemMatch: { user: oid(targetId), status: "approved" } } },
    { $set: { "cohoster.$.status": "removed", "cohoster.$.leftAt": new Date() } }
  );
  if (r.matchedCount === 0) return fail(res, 404, "That user does not hold a seat");

  ok(res, { message: "Removed from the broadcast" });
});

/*
  Mic / camera toggle. The seat holder controls their own; the host can mute
  anyone — which is what makes this usable as a moderation control too.
*/
export const toggleSeatMedia = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const targetId = req.body?.targetId || userId;
  const { micOn, videoOn } = req.body || {};

  if (!isId(id) || !isId(userId) || !isId(targetId)) {
    return fail(res, 400, "Valid stream id and userId are required");
  }
  if (micOn === undefined && videoOn === undefined) {
    return fail(res, 400, "Supply micOn and/or videoOn");
  }

  const stream = await LiveStream.findById(id).select("hoster cohoster").lean();
  if (!stream) return fail(res, 404, "Stream not found");

  const isHost = sameId(stream.hoster, userId);
  if (!isHost && !sameId(targetId, userId)) {
    return fail(res, 403, "You can only change your own mic and camera");
  }

  const set = {};
  if (micOn !== undefined) set["cohoster.$.micOn"] = !!micOn;
  if (videoOn !== undefined) set["cohoster.$.videoOn"] = !!videoOn;

  const r = await LiveStream.updateOne(
    { _id: id, cohoster: { $elemMatch: { user: oid(targetId), status: "approved" } } },
    { $set: set }
  );
  if (r.matchedCount === 0) return fail(res, 404, "That user does not hold a seat");

  ok(res, { message: "Updated", micOn, videoOn });
});

/* ------------------------------------------------------------------ */
/* 4. Send Gift Coins During Live                                      */
/* ------------------------------------------------------------------ */

export const coinBalance = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const user = await User.findById(userId).select("coins").lean();
  if (!user) return fail(res, 404, "User not found");

  const [sent, received] = await Promise.all([
    GiftTransaction.aggregate([
      { $match: { sender: oid(userId) } },
      { $group: { _id: null, coins: { $sum: "$coins" }, n: { $sum: 1 } } },
    ]),
    GiftTransaction.aggregate([
      { $match: { receiver: oid(userId) } },
      { $group: { _id: null, coins: { $sum: "$coins" }, n: { $sum: 1 } } },
    ]),
  ]);

  ok(res, {
    coins: user.coins || 0,
    sent: { coins: sent[0]?.coins || 0, gifts: sent[0]?.n || 0 },
    received: { coins: received[0]?.coins || 0, gifts: received[0]?.n || 0 },
  });
});

export const listGiftCatalogue = wrap(async (req, res) => {
  const rows = await GiftModal.find({}).sort({ coinCost: 1 }).lean();
  const grouped = {};
  for (const g of rows) (grouped[g.groupname || "General"] = grouped[g.groupname || "General"] || []).push(g);
  ok(res, { total: rows.length, byGroup: grouped, gifts: rows });
});

/*
  Send a gift over REST.

  The debit is a conditional update rather than read-modify-write: matching on
  `coins: { $gte: cost }` and decrementing in the same operation means two
  gifts fired at once cannot both pass a balance check and overdraw the wallet.
  If that update matches nothing, the sender could not afford it and nothing
  has moved.
*/
export const sendGift = wrap(async (req, res) => {
  const senderId = actorId(req);
  const { id } = req.params;
  const { giftId, quantity = 1 } = req.body || {};

  if (!isId(id) || !isId(senderId) || !isId(giftId)) {
    return fail(res, 400, "Valid stream id, userId and giftId are required");
  }
  const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 99);

  const [stream, gift] = await Promise.all([
    LiveStream.findById(id).select("hoster status channelName").lean(),
    GiftModal.findById(giftId).lean(),
  ]);
  if (!stream) return fail(res, 404, "Stream not found");
  if (stream.status !== "live") return fail(res, 409, "This stream has ended");
  if (!gift) return fail(res, 404, "Gift not found");
  if (sameId(stream.hoster, senderId)) return fail(res, 400, "You cannot gift your own stream");

  const unit = Number(gift.coinCost);
  if (!Number.isFinite(unit) || unit < 0) return fail(res, 422, "That gift has no valid coin value");
  const cost = unit * qty;

  const debit = await User.updateOne(
    { _id: oid(senderId), coins: { $gte: cost } },
    { $inc: { coins: -cost } }
  );
  if (debit.matchedCount === 0) {
    const me = await User.findById(senderId).select("coins").lean();
    return fail(res, 402, `Not enough coins — ${me?.coins || 0} available, ${cost} needed`);
  }

  await User.updateOne({ _id: oid(stream.hoster) }, { $inc: { coins: cost } });
  await LiveStream.updateOne({ _id: id }, { $inc: { gift_coins: cost, coins: cost } });

  const tx = await GiftTransaction.create({
    sender: oid(senderId),
    receiver: oid(stream.hoster),
    gift: gift._id,
    channelName: stream.channelName,
    coins: cost,
  });

  await notify({
    recipient: stream.hoster, actor: senderId, type: "live_gift",
    preview: `sent ${qty > 1 ? `${qty}x ` : ""}${gift.name} (${cost} coins)`,
    thumbnail: gift.icon,
  });

  const [me, host, totals] = await Promise.all([
    User.findById(senderId).select("coins").lean(),
    User.findById(stream.hoster).select("coins").lean(),
    LiveStream.findById(id).select("gift_coins").lean(),
  ]);

  ok(res, {
    message: "Gift sent",
    transactionId: tx._id,
    gift: { _id: gift._id, name: gift.name, icon: gift.icon, coinCost: unit },
    quantity: qty,
    coinsSpent: cost,
    senderCoins: me?.coins || 0,
    hostCoins: host?.coins || 0,
    streamGiftCoins: totals?.gift_coins || 0,
  });
});

/* Who gave the most on this stream — the board the room shows. */
export const giftLeaderboard = wrap(async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  if (!isId(id)) return fail(res, 400, "Valid stream id is required");

  const stream = await LiveStream.findById(id).select("channelName gift_coins").lean();
  if (!stream) return fail(res, 404, "Stream not found");

  const rows = await GiftTransaction.aggregate([
    { $match: { channelName: stream.channelName } },
    { $group: { _id: "$sender", coins: { $sum: "$coins" }, gifts: { $sum: 1 } } },
    { $sort: { coins: -1 } },
    { $limit: limit },
  ]);

  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } })
    .select("name image verifiedBadge").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  ok(res, {
    totalCoins: stream.gift_coins || 0,
    leaderboard: rows.map((r, i) => ({
      rank: i + 1,
      user: byId.get(String(r._id)) || { _id: r._id },
      coins: r.coins,
      gifts: r.gifts,
    })),
  });
});

export const giftHistory = wrap(async (req, res) => {
  const userId = actorId(req);
  const { page, limit, skip } = paging(req);
  const direction = req.query.direction === "received" ? "received" : "sent";
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const filter = direction === "sent" ? { sender: oid(userId) } : { receiver: oid(userId) };
  const [rows, total] = await Promise.all([
    GiftTransaction.find(filter).sort({ _id: -1 }).skip(skip).limit(limit)
      .populate("gift", "name icon coinCost")
      .populate("sender", "name image")
      .populate("receiver", "name image")
      .lean(),
    GiftTransaction.countDocuments(filter),
  ]);

  ok(res, {
    page, limit, total, direction,
    hasMore: skip + rows.length < total,
    transactions: rows,
  });
});
