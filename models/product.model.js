import mongoose from "mongoose"

const productSchema = new mongoose.Schema({
    title: {
      type: String,
      required: true
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category', // Link to the Category collection
      required: true
    },
    subcategory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategory', // Link to the Subcategory collection
      required: true
    },
    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand', // Link to the Brand collection
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    sales_price: {
      type: Number,
      required: true
    },
    available_quantity: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    product_img: {
      type: String,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  });
  
  
  const Product = mongoose.model('Product', productSchema);
  
  export default Product;
  