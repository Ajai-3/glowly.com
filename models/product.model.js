import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory',
    required: true,
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  variants: [
    {
      color: {
        type: String,
        required: true,
        trim: true,
      },
      shade: {
        type: String,
        required: true,
        trim: true,
      },
      stockQuantity: {
        type: Number,
        required: true,
        min: 0,
      },
      regularPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      salePriceBeforeOffer: { 
        type: Number,
        required: false,
        min: 0,
      },
      salePrice: {
        type: Number,
        required: true,
        min: 0,
      },
      images: {
        type: [String],
        required: true,
      },
    },
  ],
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const Product = mongoose.model('Product', productSchema);

export default Product;


// import mongoose from "mongoose"

// const productSchema = new mongoose.Schema({
//     title: {
//       type: String,
//       required: true
//     },
//     category_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Category', // Link to the Category collection
//       required: true
//     },
//     subcategory_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Subcategory', // Link to the Subcategory collection
//       required: true
//     },
//     brand_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Brand', // Link to the Brand collection
//       required: true
//     },
//     offer_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Offer', // Link to the Offer collection
//     },
//     price: {
//       type: Number,
//       required: true
//     },
//     sales_price: {
//       type: Number,
//       required: true
//     },
//     available_quantity: {
//       type: Number,
//       required: true
//     },
//     description: {
//       type: String,
//       required: true
//     },
//     product_imgs: {
//       type: [String],
//       required: true
//     },
//     isDeleted: { 
//       type: Boolean,
//       default: false // By default, the product is not deleted
//     },
//     deleted_at: {
//       type: Date,
//       default: null
//     },
//     created_at: {
//       type: Date,
//       default: Date.now
//     },
//     updated_at: {
//       type: Date,
//       default: Date.now
//     }
//   });
  
  
//   const Product = mongoose.model('Product', productSchema);
  
//   export default Product;