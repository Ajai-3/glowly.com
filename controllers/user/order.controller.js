import jwt from "jsonwebtoken";
import Order from "../../models/order.model.js";
import Cart from "../../models/cart.model.js";
import Address from "../../models/address.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import Razorpay from 'razorpay';

// next({ statusCode: 500, message: error.message });


// Render Order List Page
export const renderOrderListPage = async (req, res, next) => {
  try {
    const { user, token, cartCount, categories } = req;
    const PAGE_SIZE = 6;
    // const token = req.cookies.token;
    if (!token) {
      return res.redirect("/user/home");
    }
    const currentPage = parseInt(req.query.page) || 1;

    // let user;
    // let cart;
    // try {
    //   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    //   user = decoded;
    //   cart = await Cart.findOne({ user_id: user.userId });
    // } catch (error) {
    //   console.error("Invalid token:", error);
    // }

    
    // const cartCount = cart?.products?.length || 0;

    // const categories = await Category.find({ isListed: true }).populate({
    //   path: "subcategories",
    //   match: { isListed: true },
    // });

    const allOrders = await Order.find({ user_id: user.userId })
      .populate({
        path: 'products.product_id',
        select: '_id title description categoryId subcategoryId brandId variants',
      })
      .populate("address_id")
      .sort({ createdAt: -1 })
      .select("_id user_id address_id products total_order_amount payment_method payment_status coupon_applied createdAt updatedAt");

    const totalProductsCount = allOrders.length;
    const totalPages = Math.ceil(totalProductsCount / PAGE_SIZE);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;

    const paginatedOrders = allOrders.slice(startIndex, endIndex);

    return res.render("user/my-orders", {
      user,
      categories,
      cartCount,
      orders: paginatedOrders,
      currentPage,
      totalPages,
    });
  } catch (error) {
    console.error("Error in rendering order list:", error);
    next({ statusCode: 500, message: error.message });
  }
};



// Cancel Order
export const cancelOrder = async (req, res, next) => {
  try {
    const { user, token, cartCount, categories } = req;
    const { orderId, productId, variantId, quantity } = req.body;
    // const token = req.cookies.token;
    if (!token) {
      return res.redirect("user/home");
    }

    // let user;
    // try {
    //   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    //   user = decoded;
    // } catch (error) {
    //   console.error("Invalid token:", error);
    //   // return res.json({ success: false, message: 'Invalid token' });
    // }


    if (!productId || !variantId || !orderId || !quantity) {
      return res.status(400).json({ success: false, message: "Missing data." });
    }

    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }

    const variant = await product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Product variant is missing.' })
    }

    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order list not found.' });
      }


      const productInOrder = order.products.find(item => 
        item.product_id.toString() === productId && 
        item.variant_id.toString() === variantId
      );
      if (!productInOrder) {
        return res.status(404).json({ success: false, message: 'Product not found in the order.' });
      }
  
      if (productInOrder.status === "processing" || productInOrder.status === "pending") {
        // Update product quantity
        variant.stockQuantity += productInOrder.quantity;
        await product.save();

        // Update product status in the order
        productInOrder.status = "canceled";
        productInOrder.canceled_at = new Date();
        // Save the updated order
        await order.save();
      }

    res
      .status(200)
      .json({ success: true, message: "Order canceled successfully" });
  } catch (error) {
    console.error("Error canceling order:", error);
    next({ statusCode: 500, message: error.message });
  }
};

// Return order
export const returnOrder = async (req, res, next) => {
  try {
    const { user, token, cartCount, categories } = req;
    const { orderId, productId, variantId, quantity } = req.body;
    // const token = req.cookies.token;
    if (!token) {
      return res.redirect("user/home");
    }

    // let user;
    // try {
    //   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    //   user = decoded;
    // } catch (error) {
    //   console.error("Invalid token:", error);
    //   // return res.json({ success: false, message: 'Invalid token' });
    // }


    if (!productId || !variantId || !orderId || !quantity) {
      return res.status(400).json({ success: false, message: "Missing data." });
    }

    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }

    const variant = await product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Product variant is missing.' })
    }

    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order list not found.' });
      }


      const productInOrder = order.products.find(item => 
        item.product_id.toString() === productId && 
        item.variant_id.toString() === variantId
      );
      if (!productInOrder) {
        return res.status(404).json({ success: false, message: 'Product not found in the order.' });
      }
  
      // // Update product quantity
      // variant.stockQuantity += productInOrder.quantity;
      // await product.save();
  
      // Update product status in the order
      productInOrder.status = "return_req";
      productInOrder.return_reqested_at = new Date();
  
      // Save the updated order
      await order.save();

    res
      .status(200)
      .json({ success: true, message: "Order returned successfully" });
  } catch (error) {
    console.error("Error canceling order:", error);
    next({ statusCode: 500, message: error.message });
  }
};






// Render Order Details Page
export const orderDetailsPage = async (req, res) => {
  try {
    const { user, cart, token, cartCount, categories } = req;
    const { orderId, productId, variantId, addressId } = req.params;
    // const token = req.cookies.token;
    if (!token) {
      return res.redirect("/user/home");
    }

    // let user;
    // let cart;
    // try {
    //   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    //   user = decoded;
    //   cart = await Cart.findOne({ user_id: user.userId });
    // } catch (error) {
    //   console.error("Invalid token:", error);
    //   return res.redirect("/user/home");
    // }

    // const cartCount = cart?.products?.length || 0;
    // const categories = await Category.find({ isListed: true }).populate({
    //   path: "subcategories",
    //   match: { isListed: true },
    // });

    const order = await Order.findById(orderId)
      .populate({
        path: 'products.product_id',
        select: '_id title description categoryId subcategoryId brandId variants',
      })
      .populate("address_id");

    if (!order) {
      return res.redirect("/user/home");
    }

    const product = order.products.find(
      (p) => p.product_id._id.toString() === productId &&
             p.product_id.variants.some(variant => variant._id.toString() === variantId)
    );

    if (!product) {
      return res.redirect("/user/home");
    }

    const variant = product.product_id.variants.find(v => v._id.toString() === variantId);
    if (!variant) {
      return res.redirect("/user/home");
    }

    const address = order.address_id; 
    const productStatus = product.status || "Unknown"; 

    return res.render("user/order-details", {
      user,
      categories,
      order,
      orderId,
      product,
      variant, 
      address,
      cartCount,
      productStatus,
    });
  } catch (error) {
    console.error("Error in product detail page:", error);
    next({ statusCode: 500, message: error.message });
  }
};