export const getTopCategoriesByViews = async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const matchStage = {
      status: "live",
      add_post: req.query.add_post || "Property",
      mainCategory: { $ne: null }
    };

    const pipeline = [
      // 1️⃣ Match
      { $match: matchStage },

      // 2️⃣ Lookup USER
      {
        $lookup: {
          from: "users",
          localField: "userid",
          foreignField: "_id",
          as: "userinfo"
        }
      },
      {
        $unwind: {
          path: "$userinfo",
          preserveNullAndEmptyArrays: true
        }
      },

      // 3️⃣ Sort by views
      { $sort: { viewsCount: -1 } },

      // 4️⃣ Group by category
      {
        $group: {
          _id: "$mainCategory",
          totalViews: { $sum: "$viewsCount" },
          properties: {
            $push: {
              _id: "$_id",
              title: "$title",
              mainCategory: "$mainCategory",
              subCategory: "$subCategory",
              propertyType: "$propertyType",
              shortTitle: "$shortTitle",
              userid: "$userid",
              description: "$description",
              location: "$location",
              city: "$city",
              country: "$country",
              price: "$price",
              currency: "$currency",
              images: "$images",
              viewsCount: "$viewsCount",
              extras: "$extras",
              doors: "$doors",
              transmissiontypes: "$transmissiontypes",
              seatingcapacity: "$seatingcapacity",
              horosepower: "$horosepower",
              steeringside: "$steeringside",
              motorsType: "$motorsType",
              makemodel: "$makemodel",
              trim: "$trim",
              regional_specs: "$regional_specs",
              year: "$year",
              kilometers: "$kilometers",
              bodytype: "$bodytype",
              carinsurance: "$carinsurance",
              fueltype: "$fueltype",
              externalcolor: "$externalcolor",
              interiorcolor: "$interiorcolor",
              warranty: "$warranty",
              phoneNo: "$phoneNo",
              whatsapp: "$whatsapp",
              similartransaction: "$similartransaction",
              RERAlandlordname: "$RERAlandlordname",
              RERApreregistrationnumber: "$RERApreregistrationnumber",
              RERAtitledeednumber: "$RERAtitledeednumber",
              RERA_property_status: "$RERA_property_status",
              propertyReference: "$propertyReference",
              rentispaid: "$rentispaid",


            dealername: "$dealername",
            landlordAgent: "$landlordAgent",
            youtubeURL: "$youtubeURL",
            totalClosingFee : "$totalClosingFee",
            bedrooms: "$bedrooms",
            bathrooms: "$bathrooms",
            readyByDate: "$readyByDate",
            annualCommunityFee: "$annualCommunityFee",
            isFurnished: "$isFurnished",
            propertyReference: "$propertyReference",
            buyerTransferFee: "$buyerTransferFee",
            developer: "$developer",
            sellerTransferFee: "$sellerTransferFee",
            maintenanceFee: "$maintenanceFee",
            occupancyStatus: "$occupancyStatus", 
            amenities: "$amenities",
            maplocation: "$maplocation",

             minimumcontractperiodinmonth: "$minimumcontractperiodinmonth",
  noticeperiodinmonths: "$noticeperiodinmonths",
  securitydeposit: "$securitydeposit",
  numberoftenants: "$numberoftenants",
  typeoftenants: "$typeoftenants",
  bathroomstype: "$bathroomstype",
  preferrednationalityoftenants: "$preferrednationalityoftenants",
  balcony: "$balcony",
  roomtype: "$roomtype",
  optiontypes: "$optiontypes",
  contactoptions: "$contactoptions",

              // ✅ userinfo NOW EXISTS
              userinfo: {
                _id: "$userinfo._id",
                name: "$userinfo.name",
                email: "$userinfo.email",
                image: "$userinfo.image"
              }
            }
          }
        }
      },

      // 5️⃣ Lookup CATEGORY
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },

      // 6️⃣ Final shape
      {
        $project: {
          categoryName: "$category.name",
          categoryIcon: "$category.icon",
          categoryImage: "$category.image",
          totalViews: 1,
          properties: { $slice: ["$properties", 10] }
        }
      },

      // 7️⃣ Sort + paginate
      { $sort: { totalViews: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const data = await PropertyAds.aggregate(pipeline);

    const totalCategories = await PropertyAds.distinct("mainCategory", matchStage);

    res.status(200).json({
      success: true,
      data,
      currentPage: page,
      totalPages: Math.ceil(totalCategories.length / limit),
      totalCategories: totalCategories.length
    });

  } catch (error) {
    console.error("getTopCategoriesByViews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top categories",
      error: error.message
    });
  }
};
