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
    const { user, wishlist, cart, cartVariants, categories } = req;
    let cartProducts = [];

    const products = await Product.find({ isDeleted: false });
    const brands = await Brand.find({ isListed: true });

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

{/* <div class="cart-pagination-container mt-3">
                <% if (totalPages > 1) { %>
                  <% for (let i = 1; i <= totalPages; i++) { %>
                    <a href="?page=<%= i %>" class="page-item <%= i === currentPage ? 'active' : '' %>">
                      <div class="page-link"><%= i %></div>
                    </a>
                  <% } %>
                <% } %>
              </div> */}
// export const renderCartPage = async (req, res) => {
//   try {
//     const token = req.cookies.token;
//     let user = null;
//     let cart = null;
//     let cartProducts = [];

//     if (token) {
//       try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//         user = decoded;
//         cart = await Cart.findOne({ user_id: user.userId }).populate(
//           "products.product_id products.variant_id"
//         );
//       } catch (error) {
//         console.log("Invalid or expired token:", error);
//       }
//     }

//     const products = await Product.find({ isDeleted: false });
//     const brands = await Brand.find({ isListed: true });
//     const categories = await Category.find({ isListed: true }).populate({
//       path: "subcategories",
//       match: { isListed: true },
//     });

//     const cartCount = cart?.products?.length || 0;

//     if (cart && cart.products.length > 0) {
//       const sortedCartProducts = cart.products.sort(
//         (a, b) => new Date(b.added_at) - new Date(a.added_at)
//       );

//       cartProducts = await Promise.all(
//         sortedCartProducts.map(async (item) => {
//           const productDetails = await Product.findById(item.product_id);
//           if (!productDetails) {
//             console.log(`Product not found: ${item.product_id}`);
//             return null;
//           }

//           const variantDetails = productDetails.variants.find(
//             (variant) =>
//               variant._id &&
//               variant._id.toString() === item.variant_id?.toString()
//           );

//           if (!variantDetails) {
//             console.log(`Variant not found: ${item.variant_id}`);
//             return null;
//           }

//           return {
//             product: productDetails,
//             variant: variantDetails,
//             quantity: item.quantity,
//             added_at: item.added_at,
//           };
//         })
//       );
//       cartProducts = cartProducts.filter((item) => item !== null);
//     }

//     return res.render("user/cart", {
//       name: user ? user.name : "",
//       user,
//       cartProducts,
//       products,
//       brands,
//       categories,
//       cartCount,
//     });
//   } catch (error) {
//     console.error("Error rendering cart page:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };
// export const renderCartPage = async (req, res, next) => {
//   try {
//     const { user, wishlist, cart, cartVariants, categories } = req;
//     let cartProducts = [];
//     const PAGE_SIZE = 3;
//     const currentPage = parseInt(req.query.page) || 1;

//     const products = await Product.find({ isDeleted: false });
//     const brands = await Brand.find({ isListed: true });

//     if (cart && cart.products && cart.products.length > 0) {
//       const sortedCartProducts = cart.products.sort(
//         (a, b) => new Date(b.added_at) - new Date(a.added_at)
//       );

//       const startIndex = (currentPage - 1) * PAGE_SIZE;
//       const endIndex = startIndex + PAGE_SIZE;

//       const paginatedCartProducts = sortedCartProducts.slice(startIndex, endIndex);

//       cartProducts = await Promise.all(
//         paginatedCartProducts.map(async (item) => {
//           const productDetails = await Product.findById(item.product_id);
//           if (!productDetails) {
//             return null;
//           }

//           const variantDetails = productDetails.variants.find(
//             (variant) =>
//               variant._id &&
//               variant._id.toString() === item.variant_id?.toString()
//           );

//           if (!variantDetails) {
//             return null;
//           }

//           return {
//             product: productDetails,
//             variant: variantDetails,
//             quantity: item.quantity,
//             added_at: item.added_at,
//           };
//         })
//       );

//       cartProducts = cartProducts.filter((item) => item !== null);
//     }

//     const cartCount = cart ? cart.products.length : 0;
//     const totalPages = Math.ceil(cartCount / PAGE_SIZE);

//     return res.render("user/cart", {
//       name: user ? user.name : "",
//       user,
//       cartProducts,
//       products,
//       brands,
//       categories,
//       cartCount,
//       currentPage,
//       totalPages,
//     });
//   } catch (error) {
//     console.log("Error occurred while rendering the cart page:", error);
//     next({ statusCode: 500, message: error.message });
//   }
// };



// export const renderCartPage = async (req, res) => {
//   try {
//     const { user, wishlist, cart, cartCount, cartVariants, categories } = req;
//     // const token = req.cookies.token;
//     // let user = null;
//     // let cart = null;
//     let cartProducts = [];
//     const PAGE_SIZE = 3; 
//     const currentPage = parseInt(req.query.page) || 1;

//     // if (token) {
//     //   try {
//     //     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//     //     user = decoded;
//     //     cart = await Cart.findOne({ user_id: user.userId }).populate(
//     //       "products.product_id products.variant_id"
//     //     );
//     //   } catch (error) {
//     //     console.log("Invalid or expired token:", error);
//     //   }
//     // }

//     const products = await Product.find({ isDeleted: false });
//     const brands = await Brand.find({ isListed: true });
//     // const categories = await Category.find({ isListed: true }).populate({
//     //   path: "subcategories",
//     //   match: { isListed: true },
//     // });

//     // const cartCount = cart?.products?.length || 0;

//     // if (cart && cart.products.length > 0) {
//     //   const sortedCartProducts = cart.products.sort(
//     //     (a, b) => new Date(b.added_at) - new Date(a.added_at)
//     //   );

//       const startIndex = (currentPage - 1) * PAGE_SIZE;
//       const endIndex = startIndex + PAGE_SIZE;

//       const paginatedCartProducts = sortedCartProducts.slice(startIndex, endIndex);

//       cartProducts = await Promise.all(
//         paginatedCartProducts.map(async (item) => {
//           const productDetails = await Product.findById(item.product_id);
//           if (!productDetails) {
//             console.log(`Product not found: ${item.product_id}`);
//             return null;
//           }

//           const variantDetails = productDetails.variants.find(
//             (variant) =>
//               variant._id &&
//               variant._id.toString() === item.variant_id?.toString()
//           );

//           if (!variantDetails) {
//             console.log(`Variant not found: ${item.variant_id}`);
//             return null;
//           }

//           return {
//             product: productDetails,
//             variant: variantDetails,
//             quantity: item.quantity,
//             added_at: item.added_at,
//           };
//         })
//       );
//       cartProducts = cartProducts.filter((item) => item !== null);
//     }

//     const totalPages = Math.ceil(cartCount / PAGE_SIZE);

//     return res.render("user/cart", {
//       name: user ? user.name : "",
//       user,
//       cartProducts,
//       products,
//       brands,
//       categories,
//       cartCount,
//       currentPage,
//       totalPages,
//     });
//   } catch (error) {
//     console.log("Cart page is not loading: ", error);
//         next({ statusCode: 500, message: error.message });
//   }
// };


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
  
    const totalQuantity = cart?.products?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    // const totalQuantity = cart.products.reduce((sum, item) => sum + item.quantity, 0);
    console.log(cartCount)
    return res.json({
      success: true,
      message: "Product added to cart",
      cartCount: totalQuantity,
    });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error adding product to cart" });
  }
};
    
    // const token = req.cookies.token;
    // if (!token) {
    //   return res
    //     .status(401)
    //     .json({ success: false, message: "User not logged in" });
    // }

    // const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    // const userId = decoded.userId;

    // let cart = await Cart.findOne({ user_id: userId });



// export const addToCart = async (req, res) => {
//   let { quantity, productId, variantId } = req.body;
//   quantity = quantity || 1;

//   try {
//     const token = req.cookies.token;
//     if (!token) {
//       return res
//         .status(401)
//         .json({ success: false, message: "User not logged in" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//     const userId = decoded.userId;

//     let cart = await Cart.findOne({ user_id: userId });

//     const product = await Product.findById(productId);
//     if (!product) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Product not found" });
//     }

//     if (!variantId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Variant ID is required" });
//     }

//     const variant = product.variants.find(
//       (item) => item._id.toString() === variantId.toString()
//     );
//     if (!variant) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Variant not found" });
//     }

//     if (quantity > 6) {
//       return res.json({ success: false, message: "Cannot add more than 6." });
//     }

//     if (variant.stockQuantity < quantity) {
//       return res.json({
//         success: false,
//         message: "Not enough stock available",
//       });
//     }

//     if (cart && cart.products.length === 9) {
//       return res.json({
//         success: false,
//         message: "Your cart reached maximum limit.",
//       });
//     }

//     if (!cart) {
//       cart = new Cart({
//         user_id: userId,
//         products: [
//           {
//             product_id: productId,
//             variant_id: variantId,
//             quantity,
//             added_at: new Date(),
//           },
//         ],
//       });
//       await cart.save();

//       return res.json({ success: true, message: "Product added to cart" });
//     } else {
//       const existingItem = cart.products.find(
//         (item) => item.variant_id.toString() === variantId.toString()
//       );

//       if (existingItem) {
//         existingItem.quantity = Number(quantity);

//         if (existingItem.quantity > 6) {
//           return res.json({
//             success: false,
//             message: "Cannot add more than 6.",
//           });
//         }
//         existingItem.added_at = new Date();

//         await cart.save();

//         return res.json({
//           success: true,
//           message: "Cart updated successfully",
//         });
//       } else {
//         cart.products.push({
//           product_id: productId,
//           variant_id: variantId,
//           quantity,
//           added_at: new Date(),
//         });
//         await cart.save();

//         return res.json({ success: true, message: "Product added to cart" });
//       }
//     }
//   } catch (error) {
//     console.error("Error adding product to cart:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Error adding product to cart" });
//   }
// };

// Remove Product From Cart
export const removeCartProduct = async (req, res) => {
  try {
    const { user } = req;
    const { variantId, productId } = req.body;


        // let user;
    // const token = req.cookies.token;

    // if (token) {
    //   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    //   user = decoded;
    // } else {
    //   return res.redirect("/home");
    // }

    // const cart = await Cart.findOne({ user_id: user.userId });
    // if (!cart) {
    //   return res.json({ success: false, message: "Cart not found" });
    // }

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
    // console.log("quantity", newQuantity);
    // console.log("productId", productId);
    // console.log("variantId", variantId);

    // const token = req.cookies.token;
    // let user = null;
    // let cart = null;

    // if (!token) {
    //   return res.status(401).json({ success: false, message: "Unauthorized" });
    // }

    // try {
    //   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    //   user = decoded;
    //   cart = await Cart.findOne({ user_id: user.userId });
    // } catch (error) {
    //   console.log("Invalid or expired token:", error);
    //   return res.status(401).json({ success: false, message: "Unauthorized" });
    // }

    // if (!cart || !cart.products) {
    //   console.error("Cart or products are not defined");
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "Cart not found" });
    // }

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

    // const token = req.cookies.token;
    // console.log("quantity", quantity)
    // console.log("prouctId", productId)
    // console.log("variantId",variantId)



    // const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    // const userId = decoded.userId;

    // let cart = await Cart.findOne({ user_id: userId });

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
