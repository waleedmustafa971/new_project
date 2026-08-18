
import mongoose from 'mongoose';

const musicSchema = new mongoose.Schema({
    musicname : { type : String },
    musictype: { type : String },
    musicfile: { type : String },

    /* --- fields a music picker needs (added for "Add Music to Videos or Stories") --- */
    artist: { type: String, trim: true },
    // Seconds. Needed so the trim UI can show a waveform range at all.
    duration: { type: Number, min: 0 },
    coverImage: { type: String },
    genre: { type: String, trim: true },
    // Bumped each time a post attaches this track; drives the trending list.
    usageCount: { type: Number, default: 0 },
    // Editorially pinned, as opposed to trending by usage.
    featured: { type: Boolean, default: false },
    status: { type : String }, // Active, Inactive, Draft,
    music_group: { type : String },
    type: { type : String }, //Gender
    image: { type : String }, //Gender
    username: { type : String }, //Gender
    enteredby: { type : Date, default: Date.now },
    updateby: { type : Date, default: Date.now },
    xtime: { type : Date, default: Date.now },

});

musicSchema.index({ musicname: "text", artist: "text" });
musicSchema.index({ usageCount: -1 });
musicSchema.index({ status: 1, music_group: 1 });

const Music = mongoose.model('musictbl', musicSchema);

export default Music;  // Default export

