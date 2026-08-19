import express from "express";
import { uploadMultiple } from "../middleware/multerConfig.js";
import {
  uploadMedia, discardUpload,
  listDrafts, saveDraft, publishDraft, discardDraft, draftCount,
  editPost, deletePost, restorePost, listDeleted,
  inspectCaption,
  listMusic, trendingMusic, getTrack, attachMusic,
  musicGenres, saveTrack, unsaveTrack, savedTracks,
  listFilters, getFilter, applyEffects,
} from "../controllers/postingController.js";

const router = express.Router();

/* upload multiple photos / videos — field name "file", max 10 */
router.post("/media/upload", uploadMultiple, uploadMedia);
router.post("/media/discard", discardUpload);

/* drafts — "count" before "/:id" so the word is not read as an id */
router.get("/drafts", listDrafts);
router.get("/drafts/count", draftCount);
router.post("/drafts", saveDraft);
router.post("/drafts/:id/publish", publishDraft);
router.delete("/drafts/:id", discardDraft);

/* edit / delete / restore */
router.put("/posts/:id", editPost);
router.delete("/posts/:id", deletePost);
router.post("/posts/:id/restore", restorePost);
router.get("/deleted", listDeleted);

/* captions with emojis */
router.post("/caption/inspect", inspectCaption);

/* music library — the static words come before "/music/:id" so "trending",
   "genres" and "saved" are not read as track ids */
router.get("/music", listMusic);
router.get("/music/trending", trendingMusic);
router.get("/music/genres", musicGenres);
router.get("/music/saved", savedTracks);
router.get("/music/:id", getTrack);
router.post("/music/:id/save", saveTrack);
router.delete("/music/:id/save", unsaveTrack);
router.post("/posts/:id/music", attachMusic);

/* camera filters & beauty effects */
router.get("/filters", listFilters);
router.get("/filters/:id", getFilter);
router.post("/posts/:id/effects", applyEffects);

export default router;
