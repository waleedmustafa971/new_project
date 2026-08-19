import express from "express";
import {
  upgradeAccount, downgradeAccount, accountStatusInfo,
  recordImpression, analyticsOverview, analyticsPosts, analyticsPost,
  schedulePost, listScheduled, reschedulePost, publishDue,
  createCampaign, listCampaigns, campaignDetail, setCampaignState, cancelCampaign,
  adminListCampaigns, adminReviewCampaign,
} from "../controllers/creatorController.js";

const router = express.Router();

/* account type */
router.get("/account", accountStatusInfo);
router.post("/upgrade", upgradeAccount);
router.post("/downgrade", downgradeAccount);

/* analytics — "posts" before "posts/:id" so the list is not read as an id */
router.get("/analytics", analyticsOverview);
router.get("/analytics/posts", analyticsPosts);
router.get("/analytics/posts/:id", analyticsPost);
router.post("/impression/:id", recordImpression);

/* scheduling */
router.post("/schedule", schedulePost);
router.get("/scheduled", listScheduled);
router.post("/scheduled/publish-due", publishDue);
router.patch("/scheduled/:id", reschedulePost);

/* boosts and ads */
router.post("/campaigns", createCampaign);
router.get("/campaigns", listCampaigns);
router.get("/campaigns/:id", campaignDetail);
router.post("/campaigns/:id/state", setCampaignState);
router.post("/campaigns/:id/cancel", cancelCampaign);

/* admin review */
router.get("/admin/campaigns", adminListCampaigns);
router.post("/admin/campaigns/:id", adminReviewCampaign);

export default router;
