import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import Product from "../../models/product.model.js";
import Wishlist from "../../models/wishlist.model.js";
import { StatusCodes } from "../../helpers/StatusCodes.js";

// ========================================================================================
// RENDER WISHLIST PAGE
// ========================================================================================
// Renders the user's wishlist, displaying saved items they might want to purchase later.
// ========================================================================================
export const renderWishlistPage = async (req, res) => {
  try {
    let { user, wishlist, token, brands, cartCount, cartVariants, categories } =
      req;

      let wishlistProducts = [];
      const ITEMS_PER_PAGE = 4;
      const page = parseInt(req.query.page) || 1;
      let totalPages = 0;
      
      if (!token) {
        return res.redirect("/home");
      }
      
      if (wishlist && wishlist.products.length > 0) {
        wishlist.products.sort(
          (a, b) => new Date(b.added_at) - new Date(a.added_at)
        );
      
        let validProducts = await Promise.all(
          wishlist.products.map(async (item) => {
            const productDetails = await Product.findById(item.product_id);
            if (!productDetails || productDetails.isDeleted) return null;
      
            const variantDetails = productDetails?.variants.find(
              (variant) => variant._id.toString() === item.variant_id.toString() && !variant.isDeleted
            );
      
            if (!variantDetails) return null;
      
            return {
              product: productDetails,
              variant: variantDetails,
              added_at: item.added_at,
            };
          })
        );
      
        validProducts = validProducts.filter((item) => item !== null);
      
        const totalItems = validProducts.length;
        totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
      
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        wishlistProducts = validProducts.slice(startIndex, endIndex);
      }
      

    return res.render("user/my-wishlist", {
      name: user ? user.name : "",
      user: user,
      categories,
      brands,
      cartVariants,
      wishlistProducts,
      currentPage: page,
      totalPages,
      cartCount,
      wishlist,
    });
  } catch (error) {
    console.error("Error rendering wishlist page", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
// ADD TO WISHLIST
// ========================================================================================
// Adds a product to the user's wishlist, allowing them to save items for future reference.
// ========================================================================================
export const addToWishlist = async (req, res) => {
  try {
    let { user, wishlist, token } = req;
    const { product_id, variant_id } = req.body;

    if (!token) {
      return res.redirect("/home");
    }

    if (
      !mongoose.Types.ObjectId.isValid(product_id) ||
      !mongoose.Types.ObjectId.isValid(variant_id)
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid product_id or variant_id" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const userId = decoded.userId;

    if (!wishlist) {
      wishlist = new Wishlist({ user_id: user.userId, products: [] });
      await wishlist.save();
    }

    const isProductInWishlist = wishlist.products.some(
      (item) =>
        item.product_id.toString() === product_id &&
        item.variant_id.toString() === variant_id
    );

    if (isProductInWishlist) {
      await Wishlist.updateOne(
        { _id: wishlist._id },
        {
          $pull: {
            products: { product_id: product_id, variant_id: variant_id },
          },
        }
      );
      return res.json({ action: "removed" });
    } else {
      await Wishlist.updateOne(
        { _id: wishlist._id },
        {
          $push: {
            products: { product_id: product_id, variant_id: variant_id },
          },
        }
      );
      return res.json({ action: "added" });
    }
  } catch (error) {
    console.error("Error adding/removing product in wishlist:", error);
    return res.redirect("user/page-404");
  }
};
