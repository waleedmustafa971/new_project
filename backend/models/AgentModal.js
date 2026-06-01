import mongoose from "mongoose";

const agentSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
  phone: { type: String },
  website: { type: String },
  company: { type: String },
  cityname: { type: String },
  dateofbirth: { type: String },
  address: { type: String },
  companylogo: { type: String }, // USD
  picture: { type: String },
  certificate: { type: String },
   status: { 
    type: String, 
    enum: ["Pending", "Active", "Hold", "Reject"], 
    default: "Pending" 
  },
  ref_user: { type: String }, 
  blance: { type: String }, 
  points: { type: String }, 
  update_user: { type: String }, 
  enteredby: { type : Date, default: Date.now },
  updateby: { type : Date, default: Date.now },
  xtime: { type : Date, default: Date.now }
});

const AgentModal = mongoose.model("agent", agentSchema);
export default AgentModal;


