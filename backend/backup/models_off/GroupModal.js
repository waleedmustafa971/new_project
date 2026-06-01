import mongoose from "mongoose";

const { Schema, model } = mongoose;

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  images: {
    type: String
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const GroupModal = model("Group", groupSchema);
export default GroupModal;
