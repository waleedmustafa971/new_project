/*
  Stories (24-hour Content) — Social Media module.

  Closes the section's eight rows:

    Story Stickers ......... polls, questions, quizzes and sliders, with answers
    Close Friends Story .... the story half of the per-post audience control
    Story Highlights ....... expired stories kept on the profile
    Swipe-Up Link .......... creator and business accounts only
    Mention Users .......... story mentions, notified, and a "mentioned me" feed
    Story Filters .......... applied treatment recorded on the story
    Music Stories .......... verified against the track attachment shipped 18 Aug
    Video Stories .......... verified against the media pipeline

  A story is an ordinary post with `posttype: "Story"` and an `expiresAt`, which
  is why highlights work at all: expiry hides a story from the ring without
  deleting it, so it stays readable through a highlight afterwards.
*/

import mongoose from "mongoose";

import User from "../models/users.js";
import Reels from "../models/Reels.js";
import { NOT_DELETED } from "../helpers/feed.js";
import StoryStickerResponse from "../models/StoryStickerResponse.js";
import StoryHighlight from "../models/StoryHighlight.js";
import { isId, AUTHOR_FIELDS } from "../helpers/feed.js";
import { notify } from "../services/notificationService.js";
import { canViewPost } from "../helpers/safety.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, code, message, extra = {}) =>
  res.status(code).json({ success: false, message, ...extra });

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[stories]", req.method, req.originalUrl, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const sameId = (a, b) => String(a) === String(b);
const actorId = (req) =>
  req.user?.userId || req.user?._id || req.body?.userId || req.query?.userId || req.query?.userid;

const STORY_TTL_MS = 24 * 60 * 60 * 1000;
const STICKER_KINDS = ["poll", "question", "quiz", "slider"];
const PROFESSIONAL = ["creator", "business"];

/* Is this document actually a story, and is it still live? */
const isStory = (doc) => /^stor(y|ies)$/i.test(String(doc?.posttype || ""));
const storyIsLive = (doc, now = new Date()) => {
  if (!doc) return false;
  if (doc.expiresAt) return new Date(doc.expiresAt) > now;
  // Documents written before `expiresAt` existed fall back to their age.
  return new Date(doc.xtime) >= new Date(now.getTime() - STORY_TTL_MS);
};

const loadStory = async (id, select = "") => {
  if (!isId(id)) return null;
  const q = Reels.findById(id);
  if (select) q.select(select);
  return q.lean();
};

/* ------------------------------------------------------------------ */
/* 1. Story Stickers (Polls, Questions, Quizzes)                       */
/* ------------------------------------------------------------------ */

/*
  Add an interactive sticker to your own story.

  Validation is per kind because the kinds genuinely differ: a poll needs at
  least two options, a quiz needs those *and* a correct one among them, a
  question needs neither. Accepting a quiz whose `correctOption` points past the
  end of its options would make every answer wrong forever, so it is rejected
  here rather than discovered by the first person to play.
*/
export const addSticker = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { kind, prompt, options, correctOption, emoji, x, y } = req.body || {};

  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and story id are required");
  if (!STICKER_KINDS.includes(kind)) {
    return fail(res, 422, `kind must be one of: ${STICKER_KINDS.join(", ")}`);
  }
  if (!prompt || !String(prompt).trim()) return fail(res, 400, "A prompt is required");

  const story = await loadStory(id, "username posttype stickers expiresAt xtime");
  if (!story) return fail(res, 404, "Story not found");
  if (!isStory(story)) return fail(res, 400, "That post is not a story");
  if (!sameId(story.username, userId)) return fail(res, 403, "That is not your story");
  if (!storyIsLive(story)) return fail(res, 409, "That story has expired");
  if ((story.stickers || []).length >= 5) {
    return fail(res, 409, "A story can carry at most 5 stickers");
  }

  const list = Array.isArray(options) ? options.map((o) => String(o).slice(0, 60)).filter(Boolean) : [];

  if (["poll", "quiz"].includes(kind)) {
    if (list.length < 2 || list.length > 4) {
      return fail(res, 422, `A ${kind} needs between 2 and 4 options`);
    }
  }
  let correct = null;
  if (kind === "quiz") {
    correct = Number(correctOption);
    if (!Number.isInteger(correct) || correct < 0 || correct >= list.length) {
      return fail(res, 422, "A quiz needs correctOption to point at one of its options");
    }
  }

  const sticker = {
    _id: new mongoose.Types.ObjectId(),
    kind,
    prompt: String(prompt).trim().slice(0, 200),
    options: ["poll", "quiz"].includes(kind) ? list : [],
    correctOption: correct,
    emoji: kind === "slider" ? String(emoji || "😍").slice(0, 8) : "",
    x: Number.isFinite(Number(x)) ? Math.min(Math.max(Number(x), 0), 1) : 0.5,
    y: Number.isFinite(Number(y)) ? Math.min(Math.max(Number(y), 0), 1) : 0.5,
    createdAt: new Date(),
  };

  await Reels.updateOne({ _id: id }, { $push: { stickers: sticker } });
  ok(res, { message: "Sticker added", sticker });
});

export const removeSticker = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id, stickerId } = req.params;
  if (!isId(userId) || !isId(id) || !isId(stickerId)) {
    return fail(res, 400, "Valid userId, story id and sticker id are required");
  }

  const story = await loadStory(id, "username stickers");
  if (!story) return fail(res, 404, "Story not found");
  if (!sameId(story.username, userId)) return fail(res, 403, "That is not your story");
  if (!(story.stickers || []).some((s) => sameId(s._id, stickerId))) {
    return fail(res, 404, "Sticker not found");
  }

  await Reels.updateOne({ _id: id }, { $pull: { stickers: { _id: oid(stickerId) } } });
  // The answers go with it: results for a sticker nobody can see are noise, and
  // leaving them orphans rows that no query will ever reach again.
  await StoryStickerResponse.deleteMany({ story: oid(id), sticker: oid(stickerId) });

  ok(res, { message: "Sticker removed", stickerId });
});

/*
  Answer a sticker.

  The upsert is keyed on (story, sticker, user), so answering again replaces the
  previous answer rather than adding a second — a poll where one person votes
  twice is not a poll. The author cannot answer their own sticker: it is their
  question, and letting them vote quietly skews every result they read.
*/
export const respondToSticker = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id, stickerId } = req.params;
  const { optionIndex, value, text } = req.body || {};

  if (!isId(userId) || !isId(id) || !isId(stickerId)) {
    return fail(res, 400, "Valid userId, story id and sticker id are required");
  }

  const story = await loadStory(id, "username posttype stickers expiresAt xtime audience ageRestricted status");
  if (!story) return fail(res, 404, "Story not found");
  if (!storyIsLive(story)) return fail(res, 409, "That story has expired");
  if (sameId(story.username, userId)) {
    return fail(res, 403, "You cannot answer your own sticker");
  }

  // A story you are not allowed to see is one you cannot answer either.
  const verdict = await canViewPost(userId, story);
  if (!verdict.allowed) return fail(res, 403, `You cannot see that story (${verdict.reason})`);

  const sticker = (story.stickers || []).find((s) => sameId(s._id, stickerId));
  if (!sticker) return fail(res, 404, "Sticker not found");

  const doc = {
    story: oid(id), sticker: oid(stickerId), user: oid(userId),
    kind: sticker.kind, optionIndex: null, value: null, text: "", correct: null,
    updatedAt: new Date(),
  };

  if (sticker.kind === "poll" || sticker.kind === "quiz") {
    const pick = Number(optionIndex);
    if (!Number.isInteger(pick) || pick < 0 || pick >= (sticker.options || []).length) {
      return fail(res, 422, "optionIndex must point at one of the options");
    }
    doc.optionIndex = pick;
    // Stamped now rather than derived at read time, so editing the sticker
    // later cannot retroactively make someone's answer wrong.
    if (sticker.kind === "quiz") doc.correct = pick === sticker.correctOption;
  } else if (sticker.kind === "slider") {
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0 || v > 1) {
      return fail(res, 422, "value must be between 0 and 1");
    }
    doc.value = Math.round(v * 100) / 100;
  } else {
    const answer = String(text || "").trim();
    if (!answer) return fail(res, 400, "An answer is required");
    doc.text = answer.slice(0, 300);
  }

  await StoryStickerResponse.updateOne(
    { story: oid(id), sticker: oid(stickerId), user: oid(userId) },
    { $set: doc, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  await notify({
    recipient: story.username, actor: userId, type: "story_response",
    preview: sticker.prompt,
  });

  ok(res, {
    message: "Answer recorded",
    kind: sticker.kind,
    ...(sticker.kind === "quiz" ? { correct: doc.correct, correctOption: sticker.correctOption } : {}),
  });
});

/*
  Results, for the story's author only.

  Everyone else gets the tallies without the names — who voted for what is the
  author's to see, and a poll that tells every viewer how their friends voted is
  a different, more awkward product.
*/
export const stickerResults = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and story id are required");

  const story = await loadStory(id, "username stickers");
  if (!story) return fail(res, 404, "Story not found");
  const mine = sameId(story.username, userId);
  if (!mine) return fail(res, 403, "Only the author can see sticker results");

  const responses = await StoryStickerResponse.find({ story: oid(id) })
    .populate("user", "name image").lean();

  const results = (story.stickers || []).map((sticker) => {
    const rows = responses.filter((r) => sameId(r.sticker, sticker._id));
    const base = {
      _id: sticker._id, kind: sticker.kind, prompt: sticker.prompt, total: rows.length,
    };

    if (sticker.kind === "poll" || sticker.kind === "quiz") {
      const tally = (sticker.options || []).map((label, i) => {
        const n = rows.filter((r) => r.optionIndex === i).length;
        return {
          option: label, index: i, votes: n,
          percent: rows.length ? Math.round((n / rows.length) * 1000) / 10 : 0,
          ...(sticker.kind === "quiz" ? { isCorrect: i === sticker.correctOption } : {}),
        };
      });
      return {
        ...base, options: tally,
        ...(sticker.kind === "quiz" ? {
          correctCount: rows.filter((r) => r.correct).length,
          correctPercent: rows.length
            ? Math.round((rows.filter((r) => r.correct).length / rows.length) * 1000) / 10 : 0,
        } : {}),
      };
    }

    if (sticker.kind === "slider") {
      const values = rows.map((r) => r.value).filter((v) => v !== null);
      return {
        ...base, emoji: sticker.emoji,
        average: values.length
          ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null,
      };
    }

    return {
      ...base,
      answers: rows.map((r) => ({ user: r.user, text: r.text, at: r.createdAt })),
    };
  });

  ok(res, { storyId: id, stickers: results });
});

/* ------------------------------------------------------------------ */
/* 2. Close Friends Story                                              */
/* ------------------------------------------------------------------ */

/*
  Limit a story to close friends, or open it back up.

  The mechanism is the per-post `audience` field, so this is deliberately thin —
  a story is a post, and a second parallel visibility system for stories would
  be one more place for the rules to disagree. What this adds is the story-shaped
  entry point and the check that the list is not empty, because posting to close
  friends when you have none is silently posting to nobody.
*/
export const setStoryAudience = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const audience = String(req.body?.audience || "").trim();

  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and story id are required");
  if (!["everyone", "followers", "closeFriends"].includes(audience)) {
    return fail(res, 422, "audience must be everyone, followers or closeFriends");
  }

  const story = await loadStory(id, "username posttype");
  if (!story) return fail(res, 404, "Story not found");
  if (!isStory(story)) return fail(res, 400, "That post is not a story");
  if (!sameId(story.username, userId)) return fail(res, 403, "That is not your story");

  if (audience === "closeFriends") {
    const me = await User.findById(userId).select("closeFriends").lean();
    if (!(me?.closeFriends || []).length) {
      return fail(res, 409, "Add someone to your close friends list first");
    }
  }

  await Reels.updateOne({ _id: id }, { $set: { audience } });
  const me = await User.findById(userId).select("closeFriends").lean();

  ok(res, {
    message: audience === "closeFriends" ? "Shared with close friends only" : "Story audience updated",
    audience,
    closeFriends: (me?.closeFriends || []).length,
  });
});

/* ------------------------------------------------------------------ */
/* 3. Story Highlights on Profile                                      */
/* ------------------------------------------------------------------ */

/*
  Create a highlight.

  Expired stories are allowed in — that is the entire point. A story is never
  deleted when it lapses, only hidden from the ring by `expiresAt`, so a
  highlight can keep showing it afterwards.
*/
export const createHighlight = wrap(async (req, res) => {
  const userId = actorId(req);
  const { title, cover, storyIds } = req.body || {};
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");
  if (!title || !String(title).trim()) return fail(res, 400, "A title is required");

  const ids = Array.isArray(storyIds) ? storyIds.filter(isId) : [];
  if (ids.length) {
    const owned = await Reels.countDocuments({ _id: { $in: ids.map(oid) }, username: oid(userId) });
    if (owned !== ids.length) {
      return fail(res, 403, "You can only highlight your own stories");
    }
  }

  const last = await StoryHighlight.findOne({ owner: oid(userId) }).sort({ order: -1 }).select("order").lean();

  try {
    const highlight = await StoryHighlight.create({
      owner: oid(userId),
      title: String(title).trim().slice(0, 40),
      cover: cover || "",
      stories: ids.map(oid),
      order: (last?.order ?? -1) + 1,
    });
    ok(res, { message: "Highlight created", highlight });
  } catch (err) {
    if (err?.code === 11000) return fail(res, 409, "You already have a highlight with that title");
    throw err;
  }
});

export const listHighlights = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const ownerId = req.params.userId || viewerId;
  if (!isId(ownerId)) return fail(res, 400, "A valid userId is required");

  const rows = await StoryHighlight.find({ owner: oid(ownerId) })
    .sort({ order: 1 }).lean();

  ok(res, {
    total: rows.length,
    highlights: rows.map((h) => ({
      _id: h._id, title: h.title, cover: h.cover,
      count: (h.stories || []).length, order: h.order, createdAt: h.createdAt,
    })),
  });
});

/*
  Open a highlight.

  Each story is still run through the visibility rules — a close-friends story
  put in a highlight stays a close-friends story, and a highlight that bypassed
  that would be a way to publish restricted content by filing it.
*/
export const highlightDetail = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "A valid highlight id is required");

  const highlight = await StoryHighlight.findById(id)
    .populate("owner", AUTHOR_FIELDS).lean();
  if (!highlight) return fail(res, 404, "Highlight not found");

  // A story deleted after it was added to a highlight must leave the highlight
  // too -- the highlight holds ids, not copies.
  const stories = await Reels.find({ _id: { $in: highlight.stories || [] }, ...NOT_DELETED })
    .select("videoUrl videoTitle media music effects posttype xtime audience ageRestricted status username")
    .lean();

  const visible = [];
  for (const story of stories) {
    const verdict = await canViewPost(viewerId, story);
    if (verdict.allowed) visible.push(story);
  }

  // Preserve the owner's arrangement, which the $in lookup does not.
  const order = new Map((highlight.stories || []).map((s, i) => [String(s), i]));
  visible.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));

  ok(res, {
    highlight: {
      _id: highlight._id, title: highlight.title, cover: highlight.cover,
      owner: highlight.owner, order: highlight.order,
    },
    total: visible.length,
    hidden: stories.length - visible.length,
    stories: visible,
  });
});

export const updateHighlight = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { title, cover, order, add, remove } = req.body || {};
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and highlight id are required");

  const highlight = await StoryHighlight.findById(id).lean();
  if (!highlight) return fail(res, 404, "Highlight not found");
  if (!sameId(highlight.owner, userId)) return fail(res, 403, "That is not your highlight");

  const set = { updatedAt: new Date() };
  if (title !== undefined) set.title = String(title).trim().slice(0, 40);
  if (cover !== undefined) set.cover = String(cover);
  if (order !== undefined && Number.isFinite(Number(order))) set.order = Number(order);

  const update = { $set: set };

  if (add) {
    const ids = (Array.isArray(add) ? add : [add]).filter(isId);
    const owned = await Reels.countDocuments({ _id: { $in: ids.map(oid) }, username: oid(userId) });
    if (owned !== ids.length) return fail(res, 403, "You can only highlight your own stories");
    update.$addToSet = { stories: { $each: ids.map(oid) } };
  }
  if (remove) {
    const ids = (Array.isArray(remove) ? remove : [remove]).filter(isId);
    update.$pull = { stories: { $in: ids.map(oid) } };
  }

  // Mongo refuses $addToSet and $pull on the same field in one update, and the
  // combination is ambiguous anyway — which wins for an id in both lists?
  if (update.$addToSet && update.$pull) {
    return fail(res, 400, "Add and remove in separate requests");
  }
  if (Object.keys(set).length === 1 && !update.$addToSet && !update.$pull) {
    return fail(res, 400, "Nothing to update");
  }

  try {
    await StoryHighlight.updateOne({ _id: id }, update);
  } catch (err) {
    if (err?.code === 11000) return fail(res, 409, "You already have a highlight with that title");
    throw err;
  }
  ok(res, { message: "Highlight updated", highlight: await StoryHighlight.findById(id).lean() });
});

export const deleteHighlight = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and highlight id are required");

  const highlight = await StoryHighlight.findById(id).lean();
  if (!highlight) return fail(res, 404, "Highlight not found");
  if (!sameId(highlight.owner, userId)) return fail(res, 403, "That is not your highlight");

  // The stories themselves survive: a highlight is an arrangement of them, not
  // their home, and deleting the shelf must not burn the books.
  await StoryHighlight.deleteOne({ _id: id });
  ok(res, { message: "Highlight deleted", id });
});

/* ------------------------------------------------------------------ */
/* 4. Swipe-Up Link                                                    */
/* ------------------------------------------------------------------ */

/*
  Attach an outbound link to a story. Creator and business accounts only, which
  is the historical reason this is a distinct feature rather than a field.
*/
export const setSwipeUpLink = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { url, label } = req.body || {};
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and story id are required");

  const user = await User.findById(userId).select("accountType").lean();
  if (!user) return fail(res, 404, "User not found");
  if (!PROFESSIONAL.includes(user.accountType)) {
    return fail(res, 403, "Swipe-up links need a creator or business account");
  }

  const story = await loadStory(id, "username posttype");
  if (!story) return fail(res, 404, "Story not found");
  if (!isStory(story)) return fail(res, 400, "That post is not a story");
  if (!sameId(story.username, userId)) return fail(res, 403, "That is not your story");

  // Clearing the link is a legitimate edit, so an empty url is not an error.
  if (url === "" || url === null) {
    await Reels.updateOne({ _id: id }, { $set: { "swipeUpLink.url": "", "swipeUpLink.label": "" } });
    return ok(res, { message: "Link removed", swipeUpLink: null });
  }

  let parsed;
  try {
    parsed = new URL(String(url));
  } catch {
    return fail(res, 422, "That is not a valid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return fail(res, 422, "Only http and https links are allowed");
  }

  await Reels.updateOne({ _id: id }, {
    $set: {
      "swipeUpLink.url": parsed.href,
      "swipeUpLink.label": String(label || "Learn more").slice(0, 40),
    },
  });

  const fresh = await Reels.findById(id).select("swipeUpLink").lean();
  ok(res, { message: "Link attached", swipeUpLink: fresh.swipeUpLink });
});

/* Count a tap. Separate from the link itself so the story's author gets a
   figure without the client having to report anything else. */
export const trackSwipeUp = wrap(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "A valid story id is required");

  const story = await Reels.findById(id).select("swipeUpLink").lean();
  if (!story) return fail(res, 404, "Story not found");
  if (!story.swipeUpLink?.url) return fail(res, 404, "That story has no link");

  await Reels.updateOne({ _id: id }, { $inc: { "swipeUpLink.clicks": 1 } });
  const fresh = await Reels.findById(id).select("swipeUpLink").lean();

  ok(res, { url: fresh.swipeUpLink.url, clicks: fresh.swipeUpLink.clicks });
});

/* ------------------------------------------------------------------ */
/* 5. Mention Users in Stories                                         */
/* ------------------------------------------------------------------ */

/*
  Mention people in a story.

  The mention list is replaced wholesale rather than appended to, because the
  client sends what the story currently shows — appending would leave someone
  mentioned after their sticker was dragged off the canvas. Notifications only
  go to the people newly added, so re-saving a story does not ping everyone
  again.
*/
export const mentionInStory = wrap(async (req, res) => {
  const userId = actorId(req);
  const { id } = req.params;
  const { userIds } = req.body || {};
  if (!isId(userId) || !isId(id)) return fail(res, 400, "Valid userId and story id are required");
  if (!Array.isArray(userIds)) return fail(res, 400, "userIds must be an array");

  const story = await loadStory(id, "username posttype mentions expiresAt xtime");
  if (!story) return fail(res, 404, "Story not found");
  if (!isStory(story)) return fail(res, 400, "That post is not a story");
  if (!sameId(story.username, userId)) return fail(res, 403, "That is not your story");

  const wanted = [...new Set(userIds.filter(isId).map(String))]
    .filter((u) => !sameId(u, userId))
    .slice(0, 20);

  const exist = await User.find({ _id: { $in: wanted.map(oid) } }).select("_id name").lean();
  const valid = exist.map((u) => String(u._id));
  const unmatched = wanted.filter((w) => !valid.includes(w));

  const already = (story.mentions || []).map(String);
  const added = valid.filter((v) => !already.includes(v));

  await Reels.updateOne({ _id: id }, { $set: { mentions: valid.map(oid) } });

  for (const target of added) {
    await notify({
      recipient: target, actor: userId, type: "mention_story",
      preview: "mentioned you in their story",
    });
  }

  ok(res, {
    message: "Mentions updated",
    mentioned: valid.length,
    notified: added.length,
    unmatched,
  });
});

/* Stories that mention me and are still live. */
export const storiesMentioningMe = wrap(async (req, res) => {
  const userId = actorId(req);
  if (!isId(userId)) return fail(res, 400, "A valid userId is required");

  const now = new Date();
  const rows = await Reels.find({
    mentions: oid(userId),
    posttype: /^stor(y|ies)$/i,
    ...NOT_DELETED,
    $or: [
      { expiresAt: { $gt: now } },
      { expiresAt: null, xtime: { $gte: new Date(now.getTime() - STORY_TTL_MS) } },
    ],
  }).populate("username", "name image verifiedBadge").sort({ xtime: -1 }).lean();

  const visible = [];
  for (const story of rows) {
    const verdict = await canViewPost(userId, story);
    if (verdict.allowed) visible.push(story);
  }

  ok(res, { total: visible.length, stories: visible });
});

/* ------------------------------------------------------------------ */
/* 6. Story Filters, Music and Video — the applied treatment           */
/* ------------------------------------------------------------------ */

/*
  What a story was made with, in one call.

  Filters, music and video all shipped as part of the posting build; this is
  the read the story screen needs to reproduce a story faithfully, and the
  place the three rows are verified from rather than rebuilt.
*/
export const storyComposition = wrap(async (req, res) => {
  const viewerId = actorId(req);
  const { id } = req.params;
  if (!isId(id)) return fail(res, 400, "A valid story id is required");

  const story = await Reels.findById(id)
    .select("username posttype media videoUrl music effects mentions stickers swipeUpLink audience ageRestricted status expiresAt xtime viewsCount")
    .populate("mentions", "name image").lean();
  if (!story) return fail(res, 404, "Story not found");
  if (!isStory(story)) return fail(res, 400, "That post is not a story");

  const verdict = await canViewPost(viewerId, story);
  if (!verdict.allowed) return fail(res, 403, `You cannot see that story (${verdict.reason})`);

  const media = story.media || [];
  ok(res, {
    storyId: story._id,
    live: storyIsLive(story),
    expiresAt: story.expiresAt,
    audience: story.audience || "everyone",
    // Video stories are identified by the media actually attached rather than
    // by posttype alone — plenty of rows carry a video with no other marker.
    isVideo: media.some((m) => m.type === "video") || !!story.videoUrl?.url,
    media,
    music: story.music || null,
    filters: story.effects || null,
    mentions: story.mentions || [],
    stickers: (story.stickers || []).map((s) => ({
      _id: s._id, kind: s.kind, prompt: s.prompt, options: s.options,
      emoji: s.emoji, x: s.x, y: s.y,
      // The answer is never sent to a viewer — a quiz that ships its own
      // answer key is not a quiz.
    })),
    swipeUpLink: story.swipeUpLink?.url ? story.swipeUpLink : null,
    views: story.viewsCount || 0,
  });
});
