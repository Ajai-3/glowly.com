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
        variant_id: {
          type: String,
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
        order_placed_at: {
          type: Date,
          default: Date.now,
        },
        processing_at: {
          type: Date
        },
        shipped_at: {
          type: Date,
        },
        return_reqested_at: {
          type: Date,
        },
        canceled_at: {
          type: Date
        },
        returned_at: {
          type: Date,
        },
        delivered_at: {
          type: Date,
        },
      },
    ],
    total_order_amount: {
      type: Number,
      required: true,
    },
    payment_method: {
      type: String,
      enum: ['cash', 'razorpay', 'wallet'],
      required: true,
    },
    payment_status: {
      type: String,
      enum: ['pending', 'completed'],
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
