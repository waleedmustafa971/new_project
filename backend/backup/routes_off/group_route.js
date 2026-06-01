import express from "express";
import { addgroup, getGroupdata } from "../controllers/group_controller.js";
import authMiddleware from '../middleware/auth.js';

const router = express.Router()


router.post("/addnewgroup",addgroup) //updateOwnMusic
router.get("/getgroupbyuser", getGroupdata)


export default router