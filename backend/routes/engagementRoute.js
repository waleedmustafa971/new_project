import express from "express";
import {
  react, unreact, listReactions,
  addComment, listComments, listReplies, editComment, deleteComment,
  likeComment, listCommentLikes,
  toggleSave, savedPosts,
  sharePost, listShares,
  suggestMentions, resolveMentionNames, mentionsFeed,
  pendingTags, respondToTag, listTags,
  engagementSummary,
} from "../controllers/engagementController.js";

const router = express.Router();

/* reactions — like, love, haha, wow, sad, angry */
router.post("/posts/:id/react", react);
router.delete("/posts/:id/react", unreact);
router.get("/posts/:id/reactions", listReactions);

/* comments and threaded replies */
router.get("/posts/:id/comments", listComments);
router.post("/posts/:id/comments", addComment);
router.put("/posts/:id/comments/:commentId", editComment);
router.delete("/posts/:id/comments/:commentId", deleteComment);
router.get("/posts/:id/comments/:commentId/replies", listReplies);

/* heart a comment */
router.post("/posts/:id/comments/:commentId/like", likeComment);
router.get("/posts/:id/comments/:commentId/likes", listCommentLikes);

/* save / bookmark */
router.post("/posts/:id/save", toggleSave);
router.get("/saved", savedPosts);

/* share */
router.post("/posts/:id/share", sharePost);
router.get("/posts/:id/shares", listShares);

/* mentions */
router.get("/mentions/suggest", suggestMentions);
router.post("/mentions/resolve", resolveMentionNames);
router.get("/mentions/feed", mentionsFeed);

/* photo tags */
router.get("/tags/pending", pendingTags);
router.post("/posts/:id/tags/respond", respondToTag);
router.get("/posts/:id/tags", listTags);

/* one call for a post's whole engagement bar */
router.get("/posts/:id/summary", engagementSummary);

export default router;
