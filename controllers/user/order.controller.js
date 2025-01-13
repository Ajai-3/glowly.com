import jwt from "jsonwebtoken";
import Order from "../../models/order.js";
import Cart from "../../models/cart.model.js";
import Address from "../../models/address.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";

export const renderOrderListPage = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.redirect("user/home");
    }

    let user;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      user = decoded;
    } catch (error) {
      console.error("Invalid token:", error);
      // return res.json({ success: false, message: 'Invalid token' });
    }

    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });

    const orders = await Order.find({ user_id: user.userId })
      .populate("products.product_id")
      .populate("address_id")
      .sort({ createdAt: -1 })
      .select(
        "_id user_id address_id products total_order_amount payment_method coupon_applied createdAt updatedAt"
      );

    console.log(orders);

    return res.render("user/my-orders", {
      user: user,
      categories,
      orders,
    });
  } catch (error) {
    console.log("Error in rendering order list");
  }
};

// Cancel Order
export const cancelOrder = async (req, res) => {
  try {
    const { productId, orderId, quantity } = req.body;
    const token = req.cookies.token;
    if (!token) {
      return res.redirect("user/home");
    }

    console.log(quantity)

    let user;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      user = decoded;
    } catch (error) {
      console.error("Invalid token:", error);
      // return res.json({ success: false, message: 'Invalid token' });
    }


    if (!productId || !orderId || !quantity) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order list not found' });
      }


      const productInOrder = order.products.find(
        (item) => item.product_id.toString() === productId
      );
  
      if (!productInOrder) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found in the order" });
      }
  
      if (productInOrder.status === "canceled") {
        return res.status(400).json({
          success: false,
          message: "Product is already canceled",
        });
      }
  
      // Update product quantity
      product.available_quantity += productInOrder.quantity;
      console.log(productInOrder.quantity)
      console.log(product.available_quantity)
      await product.save();
  
      // Update product status in the order
      productInOrder.status = "canceled";
  
      // Save the updated order
      await order.save();

    res
      .status(200)
      .json({ success: true, message: "Order canceled successfully" });
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).send("Error canceling order");
  }
};


// Render Order Details Page
export const orderDetailsPage = async (req, res) => {
  try {
    const { orderId, productId, addressId } = req.params;
    // console.log("orderid", orderId)
    // console.log("product id", productId)
    // console.log("address id", addressId)
    const token = req.cookies.token;
    if (!token) {
      return res.redirect("user/home");
    }

    let user;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      user = decoded;
    } catch (error) {
      console.error("Invalid token:", error);
      // return res.json({ success: false, message: 'Invalid token' });
    }
    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });
    const order = await Order.findById(orderId)
      .populate('products.product_id') 
      .populate('address_id');

    if (!order) {
      return res.redirect("user/home");
    }

    const product = order.products.find(
      (p) => p.product_id._id.toString() === productId
    );

    if (!product) {
      return res.redirect("user/home");
    }
    console.log(product)

    const address = order.address_id; 
    const productStatus = product.status || "Unknown"; 

    return res.render("user/order-details", {
      user,
      categories,
      orderId,
      product,
      address,
      productStatus,
    });
  } catch (error) {
    console.error("Error in product detail page:", error);
    res.status(500).send("Something went wrong!");
  }
};