import express from "express";
import {
  addSticker, removeSticker, respondToSticker, stickerResults,
  setStoryAudience, setSwipeUpLink, trackSwipeUp,
  createHighlight, listHighlights, highlightDetail, updateHighlight, deleteHighlight,
  mentionInStory, storiesMentioningMe, storyComposition,
} from "../controllers/storyController.js";

const router = express.Router();

/* Static paths first, or "highlights" and "mentions" are read as story ids. */
router.post("/highlights", createHighlight);
router.get("/highlights", listHighlights);
router.get("/highlights/user/:userId", listHighlights);
router.get("/highlights/:id", highlightDetail);
router.patch("/highlights/:id", updateHighlight);
router.delete("/highlights/:id", deleteHighlight);

router.get("/mentions", storiesMentioningMe);

/* one story */
router.get("/:id", storyComposition);
router.post("/:id/audience", setStoryAudience);
router.post("/:id/mentions", mentionInStory);

/* interactive stickers */
router.post("/:id/stickers", addSticker);
router.get("/:id/stickers/results", stickerResults);
router.delete("/:id/stickers/:stickerId", removeSticker);
router.post("/:id/stickers/:stickerId/respond", respondToSticker);

/* swipe-up link */
router.post("/:id/swipe-up", setSwipeUpLink);
router.post("/:id/swipe-up/click", trackSwipeUp);

export default router;
