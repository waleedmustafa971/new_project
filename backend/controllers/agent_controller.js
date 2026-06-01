import AgentModal from "../models/AgentModal.js";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add or Update agent
export const AddAgent = async (req, res) => {
  try {
    const { body, files } = req;

    const uploadedPaths = {};
     // ✅ Log form data clearly in console
    console.log("----- Form submitted -----");
    console.log("Body:", body);
    console.log("Files:", files);
    // Process certificate file if provided
    if (files?.certificate?.[0]) {
      const certFile = files.certificate[0];
      const certName = `${Date.now()}_${certFile.originalname.replace(/\s+/g, "_")}.webp`;
      const certOutputPath = path.join("uploads/agent", certName);

      await sharp(certFile.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(certOutputPath);
      fs.unlinkSync(certFile.path);

      uploadedPaths.certificate = `/uploads/agent/${certName}`;
    }

    // Process picture file if provided
    if (files?.picture?.[0]) {
      const picFile = files.picture[0];
      const picName = `${Date.now()}_${picFile.originalname.replace(/\s+/g, "_")}.webp`;
      const picOutputPath = path.join("uploads/agent", picName);

      await sharp(picFile.path)
        .resize(1024, 768, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(picOutputPath);
      fs.unlinkSync(picFile.path);

      uploadedPaths.picture = `/uploads/agent/${picName}`;
    }

    // Merge body and uploaded file paths
    const agentData = {
      ...body,
      ...uploadedPaths,
    };

    const agent = new AgentModal(agentData);
    await agent.save();

    res.status(201).json({
      success: true,
      message: "Agent created successfully",
      agent,
    });
  } catch (err) {
    console.error("Error adding agent:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


export const updateAgent = async (req, res) => {
    try {
        const { body, params, files } = req;
        const { id } = params;

        let updatedFields = { ...body };

        // Process uploaded files
        if (files && files.length > 0) {
            for (const file of files) {
                const fileName = `${Date.now()}_${file.originalname.split(" ").join("_")}.webp`;
                const outputPath = path.join("uploads/agent", fileName);
                await sharp(file.path)
                    .resize(1024, 768, { fit: "inside" })
                    .webp({ quality: 80 })
                    .toFile(outputPath);
                fs.unlinkSync(file.path);
                updatedFields[file.fieldname] = `/uploads/agent/${fileName}`;
            }
        }

        const updatedAgent = await AgentModal.findByIdAndUpdate(id, { $set: updatedFields }, { new: true });

        if (!updatedAgent) return res.status(404).json({ success: false, message: "Agent not found" });

        res.status(200).json({ success: true, message: "Agent updated", agent: updatedAgent });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


export const deleteAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await AgentModal.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, message: "Agent not found" });
        res.status(200).json({ success: true, message: "Agent deleted" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


export const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["Pending", "Active", "Hold", "Reject"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const updated = await AgentModal.findByIdAndUpdate(id, { status }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Agent not found" });

        res.status(200).json({ success: true, message: "Status updated", agent: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


export const agentList = async (req, res) => {
    try {
        // Extract filters and pagination info from query parameters
        const {
            page = 1,
            limit = 10,
            cityname,
            firstName,
            phone,
        } = req.query;

        const query = {};

        // Filtering
        if (cityname) {
            query.address = { $regex: cityname, $options: "i" }; // case-insensitive match
        }

        if (firstName) {
            query.firstName = { $regex: firstName, $options: "i" };
        }

        if (phone) {
            query.phone = { $regex: phone, $options: "i" };
        }

        // Pagination setup
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        // Query DB
        const [agents, total] = await Promise.all([
            AgentModal.find(query)
                .sort({ xtime: -1 })
                .skip(skip)
                .limit(limitNumber),
            AgentModal.countDocuments(query),
        ]);

        // Response
        res.status(200).json({
            success: true,
            page: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            totalRecords: total,
            agents,
        });
    } catch (err) {
        console.error("Error fetching agents:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
