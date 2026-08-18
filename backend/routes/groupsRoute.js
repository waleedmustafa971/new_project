import express from "express";
import {
  /* groups */
  createGroup, listGroups, myGroups, getGroup, updateGroup,
  updateSettings, deleteGroup, restoreGroup,
  /* rules */
  listRules, addRule, updateRule, deleteRule, reorderRules, acceptRules,
  /* membership */
  joinGroup, leaveGroup, listRequests, approveRequest, rejectRequest,
  inviteMembers, respondToInvite,
  /* roles */
  listMembers, setRole, removeMember, unbanMember, listBanned, transferOwnership,
  /* posts */
  createGroupPost, groupFeed, pendingPosts, approvePost, rejectPost,
  removeGroupPost, pinGroupPost,
  /* insights */
  insights, memberGrowth, topContributors, topPosts,
} from "../controllers/groupsController.js";

const router = express.Router();

/*
  Static paths are declared before the /:groupId ones so that "my" and
  "create" are never captured as a group id.
*/

/* ---- groups ---- */
router.post("/create", createGroup);
router.get("/my", myGroups);
router.get("/", listGroups);

/* ---- rules ---- */
router.get("/:groupId/rules", listRules);
router.post("/:groupId/rules", addRule);
router.put("/:groupId/rules/reorder", reorderRules);
router.post("/:groupId/rules/accept", acceptRules);
router.patch("/:groupId/rules/:ruleId", updateRule);
router.delete("/:groupId/rules/:ruleId", deleteRule);

/* ---- membership ---- */
router.post("/:groupId/join", joinGroup);
router.post("/:groupId/leave", leaveGroup);
router.get("/:groupId/requests", listRequests);
router.post("/:groupId/requests/:userId/approve", approveRequest);
router.post("/:groupId/requests/:userId/reject", rejectRequest);
router.post("/:groupId/invite", inviteMembers);
router.post("/:groupId/invite/respond", respondToInvite);

/* ---- roles & moderation ---- */
router.get("/:groupId/members", listMembers);
router.get("/:groupId/banned", listBanned);
router.post("/:groupId/members/:userId/role", setRole);
router.post("/:groupId/members/:userId/remove", removeMember);
router.post("/:groupId/members/:userId/unban", unbanMember);
router.post("/:groupId/transfer-ownership", transferOwnership);

/* ---- posts ---- */
router.get("/:groupId/feed", groupFeed);
router.post("/:groupId/posts", createGroupPost);
router.get("/:groupId/posts/pending", pendingPosts);
router.post("/:groupId/posts/:postId/approve", approvePost);
router.post("/:groupId/posts/:postId/reject", rejectPost);
router.post("/:groupId/posts/:postId/pin", pinGroupPost);
router.delete("/:groupId/posts/:postId", removeGroupPost);

/* ---- insights ---- */
router.get("/:groupId/insights", insights);
router.get("/:groupId/insights/growth", memberGrowth);
router.get("/:groupId/insights/contributors", topContributors);
router.get("/:groupId/insights/top-posts", topPosts);

/* ---- the group itself ---- */
router.get("/:groupId", getGroup);
router.patch("/:groupId", updateGroup);
router.patch("/:groupId/settings", updateSettings);
router.post("/:groupId/restore", restoreGroup);
router.delete("/:groupId", deleteGroup);

export default router;
