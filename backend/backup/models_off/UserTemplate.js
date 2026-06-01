// models/UserTemplate.js
import mongoose from 'mongoose';

const UserTemplateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  templateVideoUrl: { type: String, required: true },
  createTimeDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['draft', 'public'], default: 'draft' }
});

export default mongoose.model('UserTemplate', UserTemplateSchema);
