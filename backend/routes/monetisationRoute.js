import express from "express";
import {
  listPackages, createPurchaseIntent, confirmPurchase, purchaseHistory, walletBalance,
  listItems, buyItem, myItems, equipItem,
  createTier, listTiers, updateTier, subscribe, cancelSubscription,
  mySubscriptions, mySubscribers, subscriptionAccess,
  earnings, earningsHistory, requestPayout, payoutHistory, cancelPayout,
  listPayoutsForAdmin, decidePayout, adjustEarnings,
} from "../controllers/monetisationController.js";

const router = express.Router();

/* ---- In-App Coin Purchase ---- */
router.get("/packages", listPackages);
router.get("/wallet", walletBalance);
router.post("/purchase/intent", createPurchaseIntent);
router.post("/purchase/confirm", confirmPurchase);
router.get("/purchase/history", purchaseHistory);

/* ---- Gift Coins & Virtual Items ---- */
router.get("/items", listItems);
router.get("/items/mine", myItems);
router.post("/items/:id/buy", buyItem);
router.post("/items/:id/equip", equipItem);

/* ---- Paid Subscription Tiers ----
   Static paths before /tiers/:creatorId, or "mine" is read as a creator id. */
router.post("/tiers", createTier);
router.get("/tiers", listTiers);
router.patch("/tiers/:id", updateTier);
router.get("/subscriptions", mySubscriptions);
router.get("/subscribers", mySubscribers);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", cancelSubscription);
router.get("/access/:creatorId", subscriptionAccess);
router.get("/tiers/:creatorId", listTiers);

/* ---- Creator Earnings System ---- */
router.get("/earnings", earnings);
router.get("/earnings/history", earningsHistory);
router.post("/payouts", requestPayout);
router.get("/payouts", payoutHistory);
router.post("/payouts/:id/cancel", cancelPayout);

/* ---- Admin ----
   Mounted under the same namespace rather than the admin panel's, so the
   payout queue and the creator-facing views read the same controller and
   cannot disagree about what a request is worth. */
router.get("/admin/payouts", listPayoutsForAdmin);
router.post("/admin/payouts/:id", decidePayout);
router.post("/admin/earnings/adjust", adjustEarnings);

export default router;
