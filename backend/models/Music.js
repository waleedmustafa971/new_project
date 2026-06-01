
import mongoose from 'mongoose';

const musicSchema = new mongoose.Schema({
    musicname : { type : String },
    musictype: { type : String },
    musicfile: { type : String },
    status: { type : String }, // Active, Inactive, Draft,
    music_group: { type : String },
    type: { type : String }, //Gender
    image: { type : String }, //Gender
    username: { type : String }, //Gender
    enteredby: { type : Date, default: Date.now },
    updateby: { type : Date, default: Date.now },
    xtime: { type : Date, default: Date.now },

});

const Music = mongoose.model('musictbl', musicSchema);

export default Music;  // Default export

