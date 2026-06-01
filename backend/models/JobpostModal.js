import mongoose from "mongoose";

const { Schema, model } = mongoose;

const jobPostSchema = new Schema(
  {
    // 🏢 Company Info
    companyname: { type: String },
    hidecompany: { type: String, enum: ["Yes", "No"], default: "No" },
    companysize: { type: String },
    tradelicenseno: { type: String },
    companycity: { type: String },
    companyaddress: { type: String },
    companyemail: { type: String },
    phoneno: { type: String },
    Writedetailsaboutcompany: { type: String },
    // 💼 Job Info
    jobtitle: { type: String },
    jobrole: { type: String },
    industrytype: { type: String },
    jobdescription: { type: String },
    employementtype: { type: String },
    remotejob: { type: String, enum: ["Yes", "No"], default: "No" },
    minimumworkingexperience: { type: String },
    minimumeducationlevel: { type: String },
    //monthlysalary: { type: String },
    monthlysalary: { type: [String] },
    cvrequired: { type: String, enum: ["Yes", "No"], default: "No" },

    // ⚙️ Optional
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    skills: [{ type: String }],     
    Benefits: [{ type: String }],   
    languages: [{ type: String }],  
    questions: [{ type: String }],  

    // 📂 Meta
    category: { type: String },
    subcategory: { type: String },
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

const JobpostModal = model("jobpost", jobPostSchema);
export default JobpostModal;
