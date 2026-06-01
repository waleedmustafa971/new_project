import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import GroupModal from '../models/GroupModal.js';
import multer from "multer";
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';

import dotenv from "dotenv";

dotenv.config();

export const addgroup = async (req, res) => {

    try {
        const { name, userId, memberIds } = req.body;
        if (!name || !userId) {
            return res.status(400).json({ message: "Group name and userId are required" });
        }
        const allMembers = memberIds ? [...new Set([...memberIds, userId])] : [userId];
        const group = new GroupModal({
            name,
            createdBy: userId,
            members: allMembers,
        });

        await group.save();

        return res.status(201).json({ message: "Group created", group });

    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }

};

export const getGroupdata = async (req, res) => {
    //GET http://localhost:8800/api/auth/users?page=1&limit=5
    //GET http://localhost:8800/api/auth/users?page=1&limit=5&search=john
    try {
        const page = parseInt(req.query.page) || 1; // Default page = 1
        const limit = parseInt(req.query.limit) || 10; // Default limit = 10
        const skip = (page - 1) * limit; // Calculate how many documents to skip
        const searchQuery = req.query.search || ""; // Get search query

        // Filtering condition: If search query exists, filter by name or email
        const filter = searchQuery
            ? {
                $or: [
                    { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
                   // { email: { $regex: searchQuery, $options: "i" } },
                ],
            }
            : {};
        const users = await GroupModal.find(filter)
            //  .select("-password")
            .skip(skip)
            .limit(limit);
        // Get total count of filtered users
        const totalMusic = await GroupModal.countDocuments(filter);
        return res.status(200).json({
            page,
            limit,
            totalMusic,
            totalPages: Math.ceil(totalMusic / limit),
            users,
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user profile" });
    }
};






