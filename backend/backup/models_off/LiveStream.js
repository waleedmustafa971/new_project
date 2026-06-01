// models/LiveStream.js

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    id: { type: String },
    user: { type: String },
    message: { type: String }
}, { _id: false });

const hostSchema = new mongoose.Schema({
    id: { type: String },
    name: { type: String },
    avatar: { type: String },
    followers_count: { type: Number, default: 0 },
    is_following: { type: Boolean, default: false }
}, { _id: false });

const liveStreamSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    host: { type: hostSchema },
    stream_url: { type: String },
    thumbnail: { type: String },
    title: { type: String },
    location: { type: String },
    coins: { type: Number, default: 0 },
    viewers_count: { type: Number, default: 0 },
    request_boxes: { type: Number, default: 5 },
    messages: { type: [messageSchema], default: [] },
    status: { type: String, default: 'Active' }, // Example: Active, Inactive
    enteredby: { type: Date, default: Date.now },
    updateby: { type: Date, default: Date.now },
    xtime: { type: Date, default: Date.now },
});

const LiveStream = mongoose.model('livestreamtbl', liveStreamSchema);

export default LiveStream;
