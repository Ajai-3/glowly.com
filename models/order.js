import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      total_amount: {
        type: Number,
        required: true,
      },
    },
  ],
  total_order_amount: {
    type: Number,
    required: true,
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'online', 'wallet'],
    required: true,
  },
  placed_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Order', OrderSchema);
