import PropertyAds from "../models/PropertyAds.js";
import Support from "../models/Support.js";
import Propertyfavourite from "../models/propertyfavourite.js";
import mongoose from "mongoose";

export const getDashboard = async (req, res) => {
    const { id } = req.params; // user id from request

    if (!id) {
        return res.status(400).json({ message: "Userid not found" });
    }

    try {
        const userId = new mongoose.Types.ObjectId(id);
        const myAdsCount = await PropertyAds.countDocuments({ userid: userId });
        const supportCount = await Support.countDocuments({ user: userId }); //Propertyfavourite
        const favouritCount = await Propertyfavourite.countDocuments({ userid: userId }); //
        const graph = await PropertyAds.aggregate([
            { $match: { userid: id } }, // note: userid is a String in your PropertyAds schema
            {
                $group: {
                    _id: { $month: "$createdAt" }, // group by month
                    totalViews: { $sum: "$viewsCount" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        //add here graph with count PropertyAds -> viewsCount i will show in line graph from this fileds how to do this
        res.json({ myAds: myAdsCount, support: supportCount, favourit: favouritCount, viewcount: graph });
        //here 
    } catch (err) {
        console.error("Error fetching PropertyAds count:", err);
        res.status(500).json({ error: err.message });
    }
};
