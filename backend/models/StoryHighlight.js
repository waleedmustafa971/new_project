// models/StoryHighlight.js

import mongoose from "mongoose";

/*
  A named collection of stories kept on a profile after they expire.

  Highlights are why a story's document is never deleted when it lapses — the
  posting controller only sets `expiresAt`, so an expired story falls out of the
  story ring while staying readable through here. A highlight that stored copies
  instead of references would double every story and drift the moment one was
  edited or removed.

  Membership is an ordered array rather than a flag on the story, because the
  same story can sit in two highlights and because the owner arranges them
  deliberately — order is content, not incidental.
*/

const storyHighlightSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },

  title: { type: String, required: true, maxlength: 40 },
  cover: { type: String, default: "" },

  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reels" }],

  // Where this highlight sits in the row on the profile.
  order: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

storyHighlightSchema.index({ owner: 1, order: 1 });
// One title per person, so a profile cannot show two identical-looking circles.
storyHighlightSchema.index({ owner: 1, title: 1 }, { unique: true });

const StoryHighlight = mongoose.model("storyhighlight", storyHighlightSchema);

export default StoryHighlight;
