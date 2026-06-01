// models/Video.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const VideoSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    prompt: { type: String }, 
    uploadId: { type: String },
    status: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const VideoFile = model('Videofile', VideoSchema);

export default VideoFile;
