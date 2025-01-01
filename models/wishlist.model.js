import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    products: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        added_at: {
          type: Date,
          default: Date.now
        }
      }
    ],
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  });
  

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
