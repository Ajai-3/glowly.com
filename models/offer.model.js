import mongoose from "mongoose"

const offerSchema = new mongoose.Schema({
  offerType: {
    type: String,
    enum: ['percentage', 'flat'],
    required: true, 
  },
  offerValue: {
    type: Number,
    required: true, 
  },
  name: {
    type: String,
    default: '', 
  },
  startDate: {
    type: Date,
    required: true, 
  },
  endDate: {
    type: Date,
    required: true, 
  },
  isActive: {
    type: Boolean,
    default: true, 
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', 
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', 
  },
});

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;
