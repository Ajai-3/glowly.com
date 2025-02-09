import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
  brandName: {
    type: String,
    required: true,
    trim: true,
  },
  brandDescription: {
    type: String,
    trim: true,
  },
  brandImage: {
    type: String,
    required: true,
  },
  soldCount: {
    type: Number,
    defualt: 0,
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  deleted_at: {
    type: Date,
    default: null,
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

const Brand = mongoose.model("Brand", brandSchema);

export default Brand;
