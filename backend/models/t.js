
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name : { type : String },
    firstname : { type : String },
    lastname : { type : String },
    email: { type: String, unique: true, required: true },
    address : {type: Object} // want to add here multi address link office address, home addres, Tutor address
});

const User = mongoose.model('users', userSchema);

export default User;  // Default export

