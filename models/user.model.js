import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone_no: {
    type: Number,
    unique: false, // Because Duplicate Index
    sparse: true,
    default: null,
  },
  googleId: {
    type: String,
    unique: true,
    default: null,
  },
  email: {
    type: String,
    required: true,
    unique: false,
    lowercase: true,
  },
  password: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: ["active", "blocked", "unblocked"],
    default: "active",
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  profilePic: {
    type: String,
    required: false,
  },
  referralCode: {
    type: String,
    required: false,
  },
  referralCode: { 
    type: String, 
    unique: true 
  },  
  referredBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    default: null 
  },
  referredUsers: { 
    type: [mongoose.Schema.Types.ObjectId], 
    ref: "User", 
    default: [] 
  },
  resetPasswordCode: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

export default User;
