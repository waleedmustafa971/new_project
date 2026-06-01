/* Tiktok modal coin setup
GroupName : Popular, Multi, Activity, Family, Treasure Box,
Privilege, SVIP, Treasure Box, Privilege, */
import mongoose from 'mongoose';

const coinsStreamSchema = new mongoose.Schema({
    userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // MUST match model name
    required: true,
    },
    groupname: { type: String },
    thumbnail: { type: String },
    priceUSD: { type: Number },
    coins: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'Inactive'], default: 'active' },
    enteredby: { type: Date, default: Date.now },
    updateby: { type: Date, default: Date.now },
    xtime: { type: Date, default: Date.now },
});

const CoinsStream = mongoose.model('coins', coinsStreamSchema);

export default CoinsStream;
