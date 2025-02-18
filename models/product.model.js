import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
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
        soldCount: {
          type: Number,
          default: 0,
        },
        images: {
          type: [String],
          required: true,
        },
        isDeleted: {
          type: Boolean,
          default: false,
        },
      },
    ],
      productOffer: {
        type: String,
        default: "Not applied",
      },
      categoryOffer: {
        type: String,
        default: "Not applied"
      },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
