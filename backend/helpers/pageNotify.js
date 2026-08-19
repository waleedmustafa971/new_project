// helpers/pageNotify.js

/*
  "A page you follow posted."

  Subscribing to a page is deliberately not the same thing as following it —
  following is how the page reaches your feed, subscribing is the bell on top
  of that — so the audience here is `pageNotificationsFor`, not `followers`.
  See subscribeToPage in controllers/notificationController.js.

  Hooked at the two places a post becomes publicly visible: createPost, and
  runDuePublish when a scheduled post's time arrives. A scheduled post must
  notify when it publishes and not when it is written, which is the whole
  reason this lives in a helper instead of inside createPost.
*/

import mongoose from "mongoose";
import User from "../models/users.js";
import { POSTTYPE } from "./feed.js";
import { notifyMany } from "../services/notificationService.js";

/* Only professional accounts are pages; a personal account has follows. */
const PAGE_TYPES = new Set(["creator", "business"]);

/*
  A ceiling on the fan-out.

  One notification per subscriber is fine at this size, but a page with a
  hundred thousand subscribers would turn a single POST into a hundred thousand
  writes inside the request. The cap keeps that from being discovered in
  production; past it, this needs a queue rather than a bigger number.
*/
const MAX_FANOUT = 500;

/*
  Notify a page's subscribers that it posted.

  Failures are swallowed, like every other notify() caller: a post that was
  created must not be reported as failed because a notification could not be
  written.
*/
export const notifyPagePost = async ({ authorId, postId, preview, thumbnail, posttype }) => {
  try {
    if (!authorId || !postId) return null;

    /*
      Stories are excluded. They have their own ring in the UI and expire in a
      day; a push per story is what makes people turn a page's bell off.
    */
    if (POSTTYPE.story.test(String(posttype || ""))) return null;

    const author = await User.findById(authorId).select("accountType").lean();
    if (!author || !PAGE_TYPES.has(author.accountType)) return null;

    const subscribers = await User.find({ pageNotificationsFor: new mongoose.Types.ObjectId(String(authorId)) })
      .select("_id")
      .limit(MAX_FANOUT)
      .lean();
    if (!subscribers.length) return null;

    return await notifyMany(subscribers.map((s) => s._id), {
      actor: authorId,
      type: "page_post",
      post: postId,
      preview,
      thumbnail,
    });
  } catch (err) {
    console.error("[page-notify]", err.message);
    return null;
  }
};

export default notifyPagePost;
