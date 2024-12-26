const mongoose = require('mongoose');

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
  description: {
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
  appliedToCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', 
  },
  appliedToProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', 
  },
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
