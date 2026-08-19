import express from "express";
import {
  getEdit, listFonts, setTrim, setOverlays, deleteOverlay, resetEdit,
} from "../controllers/editorController.js";

const router = express.Router();

/* the text tool's font list — declared before "/posts/:id" is irrelevant here,
   but kept first so the static route stays obvious */
router.get("/fonts", listFonts);

/* one post's edit decision list */
router.get("/posts/:id", getEdit);
router.put("/posts/:id/trim", setTrim);
router.put("/posts/:id/text", setOverlays);
router.delete("/posts/:id/text/:overlayId", deleteOverlay);
router.post("/posts/:id/reset", resetEdit);

export default router;
