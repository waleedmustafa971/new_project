import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import * as c from "../controllers/adminUsersController.js";

const router = express.Router();

// Everything here is admin-only; there is no public surface.
router.use(adminAuth);

/* audit log — declared before "/:id" so the word is not read as a user id */
router.get("/audit", c.listAuditLog);

/* list, export, bulk */
router.get("/", c.listUsers);
router.get("/export", c.exportUsers);
router.post("/bulk", c.bulkUsers);

/* one user */
router.get("/:id", c.getUser);
router.put("/:id", c.updateUser);
router.get("/:id/content", c.userContent);
router.get("/:id/reports", c.userReports);

/* moderation */
router.post("/:id/moderate", c.moderateUser);
router.post("/:id/verify", c.setVerified);
router.post("/:id/coins", c.adjustCoins);

/* credentials */
router.post("/:id/password", c.resetPassword);
router.post("/:id/revoke-sessions", c.revokeSessions);

/* delete / restore */
router.delete("/:id", c.deleteUser);
router.post("/:id/restore", c.restoreUser);

export default router;
