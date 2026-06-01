import mongoose from "mongoose";

// Define sub-schema for interactions
const interactionSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 1 }
});

const starSchema = new mongoose.Schema({
  username: { type: String, required: true }, // User who liked the comment
  count: { type: Number, default: 1 },
  userinfo: {type : Object},
  amount: {type : Number, default: 0},
  xtime: { type: Date, default: Date.now }
});

// Define sub-schema for comment likes
const commentLikeSchema = new mongoose.Schema({
  username: { type: String, required: true }, // User who liked the comment
  count: { type: Number, default: 1 },
  userinfo: {type : Object},
  xtime: { type: Date, default: Date.now }
});

const commentReplyLikeSchema = new mongoose.Schema({
  username: { type: String, required: true }, // User who liked the comment
  message: { type: String },
  userinfo: {type : Object},
  xtime: { type: Date, default: Date.now }
});


// Define sub-schema for comments
const commentSchema = new mongoose.Schema({
  username: { type: String, required: true }, // User who posted the comment
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
  username: { type: String, index: true }, // Indexed for faster queries
  xtime: { type: Date, default: Date.now },
  likes: { type: [interactionSchema], default: [] },
  dislikes: { type: [interactionSchema], default: [] },
  // Updated comments schema with username, message, and likes
  comments: { type: [commentSchema], default: [] },
  favorites: { type: [interactionSchema], default: [] },
  shares: { type: [interactionSchema], default: [] },
  stars: { type: [starSchema], default: [] },
  tagpeople: { type: Object },
  location: { type: String },
  sharegroup: { type: Object }

});

// Create Model
const Reels = mongoose.model("Reels", videoSchema);
export default Reels;
