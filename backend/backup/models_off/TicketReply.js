import mongoose from "mongoose";
const { Schema } = mongoose;

const TicketReplySchema = new Schema(
  {
   // ticket: { type: String, required: true },
    ticket: { type: Schema.Types.ObjectId, ref: "users", required: true },
    user: { type: String, required: true }, // admin or customer
    message: { type: String, required: true },
    attachments: [{ type: String }],
    createdBy: { type: String },
  },
  { timestamps: true }
);

const TicketReply = mongoose.model("TicketReply", TicketReplySchema);
export default TicketReply;
