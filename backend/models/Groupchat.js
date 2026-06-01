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
    isDisappearing: { 
        type: String, 
        required: true 
    },
    grouppermission_enable: { 
        type: String, 
        required: true 
    },
    groupPermission: { 
        type: String, 
        enum: ['admin_only', 'all_members'], 
        default: 'all_members'
    },
    editgroupsetting: { 
        type: String, 
        required: true 
    },
    sendmessagepermission: { 
        type: String, 
        required: true 
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

// Model
const GroupChat = mongoose.model('GroupChat', groupChatSchema);
export { GroupChat };
