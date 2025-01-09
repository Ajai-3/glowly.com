import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    address_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
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
        status: {
          type: String,
          enum: ['pending', 'processing', 'shipped', 'delivered', 'canceled', 'return_req', 'returned'],
          default: 'pending',
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
    coupon_applied: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', OrderSchema);

export default Order;
