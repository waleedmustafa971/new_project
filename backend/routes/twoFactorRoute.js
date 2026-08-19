import express from "express";
import {
  status, setup, enable, disable, regenerateRecoveryCodes, verify,
} from "../controllers/twoFactorController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/*
  The challenge exchange is deliberately unauthenticated: the caller has just
  given a correct password and holds no session yet, which is the whole point of
  the step. The challenge token is what stands in for one.
*/
router.post("/verify", verify);

/* Everything else manages the factor and needs a live session. */
router.get("/status", authMiddleware, status);
router.post("/setup", authMiddleware, setup);
router.post("/enable", authMiddleware, enable);
router.post("/disable", authMiddleware, disable);
router.post("/recovery-codes", authMiddleware, regenerateRecoveryCodes);

export default router;
