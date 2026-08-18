import mongoose from "mongoose";

/*
  Search log (Discovery & Search module).

  Serves two different jobs from one collection:

    - per-user recent searches, which is why `user` is indexed with `lastAt`
    - trending searches, which aggregates across users over a window

  One row per (user, normalised term): searching the same thing twice bumps
  `count` and `lastAt` instead of stacking rows, so a person repeating a query
  cannot flood their own history — and, more importantly, cannot manufacture a
  trend on their own. Trending counts distinct users, not rows.
*/

const searchQuerySchema = new mongoose.Schema({
  // null for a signed-out search: still counted for trending, never shown as
  // anyone's history.
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },

  // Lowercased, whitespace-collapsed. The display form is kept separately so
  // the history list can show what the person actually typed.
  term: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
  display: { type: String, trim: true, maxlength: 100 },

  // What the search was scoped to when it ran (all / posts / users / …).
  scope: { type: String, default: "all" },

  // Whether the user acted on a result. A query nobody ever clicks through is
  // a bad suggestion however often it is typed.
  resultCount: { type: Number, default: 0 },
  clicked: { type: Boolean, default: false },

  count: { type: Number, default: 1 },
  firstAt: { type: Date, default: Date.now },
  lastAt: { type: Date, default: Date.now },
});

// The upsert key.
searchQuerySchema.index({ user: 1, term: 1 }, { unique: true });
// "My recent searches", newest first.
searchQuerySchema.index({ user: 1, lastAt: -1 });
// Trending: everything in a window, grouped by term.
searchQuerySchema.index({ lastAt: -1, term: 1 });

const SearchQuery = mongoose.model("searchquery", searchQuerySchema);
export default SearchQuery;
