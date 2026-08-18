import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import * as c from "../controllers/adminPanelController.js";

const router = express.Router();

/* ---- public ---- */
router.get("/bootstrap-status", c.bootstrapStatus);
router.post("/bootstrap", c.bootstrap);
router.post("/login", c.login);
// Lets the mobile app file a report into the moderation queue
router.post("/reports", c.createReport);

/* ---- everything below requires an admin token ---- */
router.use(adminAuth);

router.get("/me", c.me);
router.get("/dashboard", c.dashboard);

/* users */
router.get("/users", c.listUsers);
router.get("/users/:id", c.getUser);
router.put("/users/:id", c.updateUser);
router.post("/users/:id/moderate", c.moderateUser);
router.post("/users/:id/coins", c.adjustCoins);
router.delete("/users/:id", c.deleteUser);

/* content moderation */
router.get("/content", c.listContent);
router.post("/content/bulk", c.bulkContent);
router.get("/content/:id", c.getContent);
router.post("/content/:id/moderate", c.moderateContent);
router.delete("/content/:id", c.deleteContent);

/* comments */
router.get("/comments", c.listComments);
router.delete("/comments/:contentId/:commentId", c.deleteComment);

/* reports */
router.get("/reports", c.listReports);
router.post("/reports/:id/resolve", c.resolveReport);
router.delete("/reports/:id", c.deleteReport);

/* groups */
router.get("/groups", c.listGroups);
router.get("/groups/:id", c.getGroup);
router.put("/groups/:id", c.updateGroup);
router.post("/groups/:id/members", c.groupMemberAction);
router.delete("/groups/:id", c.deleteGroup);

/* live streams */
router.get("/live", c.listLive);
router.get("/live/:id", c.getLive);
router.post("/live/:id/end", c.endLive);
router.delete("/live/:id", c.deleteLive);

/* hashtags & trending */
router.get("/hashtags", c.listHashtags);
router.post("/hashtags/rebuild", c.rebuildHashtags);
router.post("/hashtags", c.upsertHashtag);
router.put("/hashtags/:id", c.updateHashtag);
router.delete("/hashtags/:id", c.deleteHashtag);

/* monetisation */
router.get("/coin-packages", c.listCoinPackages);
router.post("/coin-packages", c.saveCoinPackage);
router.put("/coin-packages/:id", c.saveCoinPackage);
router.delete("/coin-packages/:id", c.deleteCoinPackage);

router.get("/gifts", c.listGifts);
router.post("/gifts", c.saveGift);
router.put("/gifts/:id", c.saveGift);
router.delete("/gifts/:id", c.deleteGift);

router.get("/gift-transactions", c.listGiftTransactions);
router.get("/transactions", c.listTransactions);

/* music library */
router.get("/music", c.listMusic);
router.post("/music", c.saveMusic);
router.put("/music/:id", c.saveMusic);
router.delete("/music/:id", c.deleteMusic);

/* verification (blue tick) */
router.get("/verifications", c.listVerifications);
router.post("/verifications/:id/decide", c.decideVerification);

/* support */
router.get("/support", c.listSupport);
router.put("/support/:id", c.updateSupport);

/* notifications */
router.get("/notifications/audience", c.notificationAudience);
router.post("/notifications/send", c.sendNotification);

/* categories */
router.get("/categories", c.listCategories);
router.post("/categories", c.saveCategory);
router.put("/categories/:id", c.saveCategory);
router.delete("/categories/:id", c.deleteCategory);

/* ads & promotions */
router.get("/promos", c.listPromos);
router.post("/promos", c.savePromo);
router.put("/promos/:id", c.savePromo);
router.delete("/promos/:id", c.deletePromo);

/* admin accounts */
router.get("/admins", c.listAdmins);
router.post("/admins", c.saveAdmin);
router.put("/admins/:id", c.saveAdmin);
router.delete("/admins/:id", c.deleteAdmin);

/* messaging overview */
router.get("/messaging", c.messagingOverview);

export default router;
