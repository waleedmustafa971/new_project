import mongoose from "mongoose";

// Define sub-schema for interactions
const interactionSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  count: { type: Number, default: 1 }
});

const sharepostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  text: { type: String, trim: true },
  originalPost: { type: mongoose.Schema.Types.ObjectId, ref: "Reels", required: true },
  xtime: { type: Date, default: Date.now }
});

const starSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  count: { type: Number, default: 1 },
  userinfo: {type : Object},
  amount: {type : Number, default: 0},
  xtime: { type: Date, default: Date.now }
});

// Define sub-schema for comment likes
const commentLikeSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  count: { type: Number, default: 1 },
  userinfo: {type : Object},
  xtime: { type: Date, default: Date.now }
});

const commentReplyLikeSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  message: { type: String },
  userinfo: {type : Object},
  xtime: { type: Date, default: Date.now }
});


// Define sub-schema for comments
const commentSchema = new mongoose.Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  message: { type: String, required: true },  // The comment text
  timestamp: { type: Date, default: Date.now }, // When the comment was posted
  likes: { type: [commentLikeSchema], default: [] }, // Users who liked the comment
  reply: { type: [commentReplyLikeSchema], default: [] }
  
});

const videoSchema = new mongoose.Schema({
  videoUrl: { type: Object, required: true },
  videoTitle: { type: String },
  videosound: { type: String },  
  textoverlays: { type: Object },
  emojioverlays: { type: Object },
  sound: { type: Object },
  posttype: { type: String },
  posttypechild: { type: String },
  xbackgroundcolor: {type: String},
  xfontstyle: {type: String},
  xfontsize: {type: String},
  xtextalign: {type: String},
  ispost:  { type: String },
  //username: { type: String, index: true }, // Indexed for faster queries
  username: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  xtime: { type: Date, default: Date.now },
  likes: { type: [interactionSchema], default: [] },
  dislikes: { type: [interactionSchema], default: [] },
  // Updated comments schema with username, message, and likes
  comments: { type: [commentSchema], default: [] },
  favorites: { type: [interactionSchema], default: [] },
  shares: { type: [interactionSchema], default: [] },
  savepost: { type: [interactionSchema], default: [] },
  sharepost: { type: [sharepostSchema], default: [] },
  stars: { type: [starSchema], default: [] },
  tagpeople: { type: Object },
  location: { type: String },
  status: {
    type: String
  },
  status_draft_publish: {
    type: String,
    enum: ["Draft", "Publish"],
    default: "Draft",
    required: true,
  },
  sharegroup: { type: Object }

});

// Create Model
const Reels = mongoose.model("Reels", videoSchema);
export default Reels;
