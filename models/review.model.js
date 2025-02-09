import mongoose from "mongoose"

const reviewSchema = new mongoose.Schema ({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false
      },
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Variant',
        required: true
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      variantShade: {
        type: String,
        required: true
      },
      review: {
        type: String,
        required: true,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
})

const Review = mongoose.model("Review", reviewSchema);

export default Review;