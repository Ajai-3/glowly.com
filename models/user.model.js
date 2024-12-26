import mongoose from "mongoose";

const userSchema = new mongoose.Schema ({
    name: {
        type: String,
        required: true
    },
    phone_no: {
        type: Number,
        unique: true,
        sparse: true,
        default: null 
    },
    googleId: {
        type: String,
        unique: true,
        default: null,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'blocked', 'unblocked'],
        default: 'active'
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
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