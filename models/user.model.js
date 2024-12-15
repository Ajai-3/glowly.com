import mongoose from "mongoose";

const userSchema = new mongoose.Schema ({
    name: {
        type: String,
        required: true
    },
    phone_no: {
        type: Number,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'blocked', 'unblocked'],
        default: 'active'
    },
    role: {
        type: String,
        role: ['user', 'admin'],
        default: 'user'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('user', userSchema) // Create A Model To Work With The Database

export default User;