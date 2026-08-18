import Socialgroup from "../models/socialmediagroup.js";
import GroupMember from "../models/GroupMember.js";
import { syncGroupMembership, isId, oid } from "../helpers/groups.js";
import { processLogo } from "../helpers/uploadGroupimage.js";
import fs from "fs";
import path from "path";

/*
  Legacy group CRUD, kept at /api/socialgroup.

  The richer surface lives at /apis/groups (controllers/groupsController.js);
  these four endpoints stay because the admin side still calls them, and their
  request and response shapes are unchanged. What changed here is only that
  update and delete now address the group collection at all — both referenced
  an undefined `Vendor` binding copied in from the vendor controller, so every
  call threw a ReferenceError before reaching the database.
*/

const logoPathFor = (filename) => path.join("uploads/groupimage", filename);

/* ---------------- ADD GROUP ---------------- */
export const addGroup = async (req, res) => {
  try {
    // Process logo if uploaded
    let logoFilename = null;
    if (req.file) {
      logoFilename = await processLogo(req.file);
    }

    const groupData = {
      ...req.body,
      logo: logoFilename,
    };

    const newGroup = new Socialgroup(groupData);
    const savedGroup = await newGroup.save();

    /*
      Give the creator an ownership row so a group made through this route is
      administrable through /apis/groups. Without it the group has members but
      nobody who can moderate it.
    */
    if (isId(savedGroup.creator)) {
      await GroupMember.findOneAndUpdate(
        { group: savedGroup._id, user: oid(savedGroup.creator) },
        { $set: { role: "owner", status: "active", joinedAt: new Date() } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      await syncGroupMembership(savedGroup._id);
    }

    res.status(201).json({ success: true, data: savedGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- UPDATE GROUP ---------------- */
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Socialgroup.findById(id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    // Process new logo if uploaded (replace)
    let logoFilename = group.logo;
    if (req.file) {
      // delete old file if exists
      if (logoFilename) {
        const oldPath = logoPathFor(logoFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      logoFilename = await processLogo(req.file);
    }

    /*
      Membership is owned by the groupmember collection now, so it is dropped
      from the payload rather than written from a form post — a stray
      `members` field here would overwrite the synced arrays wholesale.
    */
    const { members, admins, pendingRequests, memberCount, pendingCount, ...safe } = req.body;

    const updateData = {
      ...safe,
      logo: logoFilename,
    };

    const updated = await Socialgroup.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- DELETE GROUP ---------------- */
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Socialgroup.findByIdAndDelete(id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    // Membership rows would otherwise outlive the group they belong to.
    await GroupMember.deleteMany({ group: group._id });

    // remove logo file
    if (group.logo) {
      const logoPath = logoPathFor(group.logo);
      if (fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
    }

    res.json({ success: true, message: "Group deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- LIST GROUPS ---------------- */
export const listGroup = async (req, res) => {
  try {
    // support query params: page, limit, search, status
    const { page = 1, limit = 20, search = "", status } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } }
      ];
    }
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const total = await Socialgroup.countDocuments(filter);
    const groups = await Socialgroup.find(filter)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });


    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: groups
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
