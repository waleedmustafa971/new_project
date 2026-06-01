import mongoose from "mongoose";
/* 
Name : “Nafiza”, mobile: “”, email: “”, accountno: “””, 
bankname: “2”, branchname: “”, address: “”

*/
const testSchema = new mongoose.Schema(
  {
    name: { type: String }, 
    mobile: { type: String }, 
    email : {type : String},
    accountno : {type : String},
    bankname : {type : String},
    branchname : {type : String},
    image : {type : String}
  },
  { timestamps: true }
);

export default mongoose.model("testinvoice", testSchema);
