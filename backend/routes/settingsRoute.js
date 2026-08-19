import express from "express";
import {
  getSettings, updateSettings, listLanguages, getStrings,
} from "../controllers/settingsController.js";

const router = express.Router();

/* appearance — theme and language */
router.get("/", getSettings);
router.put("/", updateSettings);

/* the translation catalogue. "languages" and "strings" are declared as their
   own paths, not under "/:id", because this router has no id routes at all. */
router.get("/languages", listLanguages);
router.get("/strings", getStrings);

export default router;
