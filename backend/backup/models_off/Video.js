// models/Video.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const VideoSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true }, // Video file URL or storage link
    bannerImage: { type: String, required: true }, // Banner/thumbnail image URL
    ageLimit: { type: Number, default: 0 }, // Age restriction
    tags: [{ type: String }], // For keyword filtering
    playlist: { type: String }, // Playlist name or can be ObjectId
    status: {
        type: String,
        enum: ['draft', 'approved', 'published', 'unpublished'],
        default: 'draft'
    },
    uploadedAt: { type: Date, default: Date.now }
});

const Video = model('Video', VideoSchema);

export default Video;
