import mongoose from 'mongoose';

const groupChatSchema = new mongoose.Schema({  
    groupName: { 
        type: String, 
        required: true 
    },
    groupimage: { 
        type: String, 
        required: false 
    },
    createdBy: { 
        type: String, 
        required: true 
    },
    description: { type: String, trim: true, maxlength: 500 },
    // Soft delete, so a disbanded group's message history is not orphaned.
    deletedAt: { type: Date, default: null },
    isDisappearing: { 
        type: String, 
        default: 'no'
    },
    grouppermission_enable: { 
        type: String, 
        default: 'no'
    },
    groupPermission: { 
        type: String, 
        enum: ['admin_only', 'all_members'], 
        default: 'all_members'
    },
    editgroupsetting: { 
        type: String, 
        default: 'no'
    },
    sendmessagepermission: { 
        type: String, 
        default: 'no'
    },
    members: [
        { 
            type: mongoose.Schema.ObjectId, 
            ref: 'users' 
        }
    ],
    admins: [
        { 
            type: mongoose.Schema.ObjectId, 
            ref: 'users'
        }
    ],
    messages: [
        { 
            type: mongoose.Schema.ObjectId, 
            ref: 'Messages'
        }
    ],
}, {
    timestamps: true
});

/*
  `members` is the field every membership question should be asked against.
  `createdBy` is only the founder — the legacy /apis/messenger/getmessengergroup
  filters on it, which is why that endpoint never returns a group you were
  added to.
*/
groupChatSchema.index({ members: 1, updatedAt: -1 });
groupChatSchema.index({ createdBy: 1 });

// Model
const GroupChat = mongoose.model('GroupChat', groupChatSchema);
export { GroupChat };
