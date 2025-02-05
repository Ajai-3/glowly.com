import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";dotenv.config();
import User from "../../models/user.model.js";
import Cart from "../../models/cart.model.js";
import Brand from "../../models/brand.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";





export const renderCartPage = async (req, res, next) => {
  try {
    const { user, wishlist, brands, cart, cartVariants, categories } = req;
    let cartProducts = [];

    const products = await Product.find({ isDeleted: false });

    if (cart && cart.products && cart.products.length > 0) {
      const sortedCartProducts = cart.products.sort(
        (a, b) => new Date(b.added_at) - new Date(a.added_at)
      );

      // Fetch product and variant details for all cart items (no pagination in backend)
      cartProducts = await Promise.all(
        sortedCartProducts.map(async (item) => {
          const productDetails = await Product.findById(item.product_id);
          if (!productDetails) {
            return null;
          }

          const variantDetails = productDetails.variants.find(
            (variant) =>
              variant._id &&
              variant._id.toString() === item.variant_id?.toString()
          );

          if (!variantDetails) {
            return null;
          }

          return {
            product: productDetails,
            variant: variantDetails,
            quantity: item.quantity,
            added_at: item.added_at,
          };
        })
      );

      // Filter out null items if there are any
      cartProducts = cartProducts.filter((item) => item !== null);
    }

    const cartCount = cart ? cart.products.length : 0;

    return res.render("user/cart", {
      name: user ? user.name : "",
      user,
      cartProducts,
      products,
      brands,
      categories,
      cartCount,
    });
  } catch (error) {
    console.log("Error occurred while rendering the cart page:", error);
    next({ statusCode: 500, message: error.message });
  }
};



// Add Product To Cart
export const addToCart = async (req, res) => {
  try {
    let { quantity, productId, variantId } = req.body;
    quantity = quantity || 1;
    let { user, cart } = req;
    let cartCount;

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (!variantId) {
      return res
        .status(400)
        .json({ success: false, message: "Variant ID is required" });
    }

    const variant = product.variants.find(
      (item) => item._id.toString() === variantId.toString()
    );
    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "Variant not found" });
    }

    if (quantity > 6) {
      return res.json({ success: false, message: "Cannot add more than 6." });
    }

    if (variant.stockQuantity < quantity) {
      return res.json({
        success: false,
        message: "Not enough stock available",
      });
    }

    if (cart && cart.products.length === 9) {
      return res.json({
        success: false,
        message: "Your cart reached maximum limit.",
      });
    }

    if (!cart) {
      cart = new Cart({
        user_id: user.userId,
        products: [
          {
            product_id: productId,
            variant_id: variantId,
            quantity,
            added_at: new Date(),
          },
        ],
      });
      await cart.save();
    } else {
      const existingItem = cart.products.find(
        (item) => item.variant_id.toString() === variantId.toString()
      );

      if (existingItem) {
        existingItem.quantity = Number(quantity);

        if (existingItem.quantity > 6) {
          return res.json({
            success: false,
            message: "Cannot add more than 6.",
          });
        }
        existingItem.added_at = new Date();
        await cart.save();
      } else {
        cart.products.push({
          product_id: productId,
          variant_id: variantId,
          quantity,
          added_at: new Date(),
        });
        await cart.save();
      }
    }
  
    const totalProducts = cart?.products?.length || 0;
    
    return res.json({
      success: true,
      message: "Product added to cart",
      cartCount: totalProducts,
    });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error adding product to cart" });
  }
};
    
    

// Remove Product From Cart
export const removeCartProduct = async (req, res) => {
  try {
    const { user } = req;
    const { variantId, productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const result = await Cart.updateOne(
      { user_id: user.userId },
      { $pull: { products: { product_id: productId, variant_id: variantId } } }
    );

    if (result.modifiedCount === 0) {
      return res.json({ success: false, message: "Product not found in cart" });
    }

    return res.json({
      success: true,
      message: "Product removed from cart.",
      productId,
    });
  } catch (error) {
    console.error("Error in removing product from cart:", error);
    return res.status(500).send("Error in removing product");
  }
};

// Update Product Quantity In Cart Page
export const updateCartPageProduct = async (req, res) => {
  try {
    const { newQuantity, productId, variantId } = req.body;
    let { user, cart, cartCount } = req;
   
    const productInCart = cart.products.find(
      (item) =>
        item.product_id.toString() === productId.toString() &&
        item.variant_id.toString() === variantId.toString()
    );
    if (!productInCart) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "Variant not found" });
    }

    if (variant.stockQuantity < newQuantity) {
      return res
        .status(400)
        .json({ success: false, message: "Not enough stock available" });
    }

    productInCart.quantity = newQuantity;

    await cart.save();
    return res.json({ success: true, message: "Cart updated successfully" });
  } catch (error) {
    console.error("Error in updating cart product:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// Buy Now Button in product page
export const buyNow = async (req, res) => {
  try {
    const { quantity, productId, variantId } = req.body;
    let { user, cart, token } = req;
    if (!token) {
      return res.status(404).json({
        success: false,
        message: `Login to buy product.`,
      });
    }

    if (!cart) {
      console.log("No cart found for the user, creating a new one.");
      cart = new Cart({
          user_id: user.userId,
          products: [] 
      }); 
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const variant = await product.variants.id(variantId);
    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "Variant not found" });
    }

    if (quantity > 6) {
      return res.json({ success: false, message: "Cannot add more than 6." });
    }

    if (variant.stockQuantity < quantity) {
      return res.json({
        success: false,
        message: "Not enough stock available",
      });
    }


    if (cart.products.length === 16) {
      return res.json({
        success: false,
        message: "Your cart rech maximum limit.",
      });
    }

    if (!cart) {
      cart = new Cart({
        user_id: user.userId,
        products: [
          {
            product_id: productId,
            variant_id: variantId,
            quantity,
            added_at: new Date(),
          },
        ],
      });
      await cart.save();
      const totalQuantity = cart?.products?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      return res.json({ success: true, message: "Product added to cart", cartCount: totalQuantity });
    } else {
      const existingItem = cart.products.find(
        (item) => item.variant_id.toString() === variantId.toString()
      );

      if (existingItem) {
        existingItem.quantity = Number(quantity);

        if (existingItem.quantity > 6) {
          return res.json({
            success: false,
            message: "Cannot add more than 6.",
          });
        }
        existingItem.added_at = new Date();

        await cart.save();
        const totalQuantity = cart?.products?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        return res.json({
          success: true,
          message: "Cart updated successfully",
          cartCount: totalQuantity
        });
      } else {
        cart.products.push({
          product_id: productId,
          variant_id: variantId,
          quantity,
          added_at: new Date(),
        });
        await cart.save();
        const totalQuantity = cart?.products?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        return res.json({ success: true, message: "Product added to cart", cartCount: totalQuantity });
      }
    }
  } catch (error) {
    console.error("Error handling buy-now request:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
