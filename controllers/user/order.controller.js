import Order from "../../models/order.model.js";
import Review from "../../models/review.model.js";
import Product from "../../models/product.model.js";

// ========================================================================================
// RENDER ORDER LIST PAGE
// ========================================================================================
// Renders the page displaying the user's past orders, including order details and status.
// ========================================================================================
export const renderOrderListPage = async (req, res) => {
  try {
    const { user, token, brands, cartCount, categories } = req;
    const PAGE_SIZE = 6;
    if (!token) {
      return res.redirect("/user/home");
    }
    const currentPage = parseInt(req.query.page) || 1;

    const allOrders = await Order.find({ user_id: user.userId })
      .populate({
        path: "products.product_id",
        select:
          "_id title description categoryId subcategoryId brandId variants",
      })
      .populate("address_id")
      .sort({ createdAt: -1 })
      .select(
        "_id user_id address_id products total_order_amount payment_method payment_status coupon_applied createdAt updatedAt"
      );

    const totalProductsCount = allOrders.length;
    const totalPages = Math.ceil(totalProductsCount / PAGE_SIZE);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;

    const paginatedOrders = allOrders.slice(startIndex, endIndex);

    return res.render("user/my-orders", {
      user,
      brands,
      categories,
      cartCount,
      orders: paginatedOrders,
      currentPage,
      totalPages,
    });
  } catch (error) {
    console.error("Error in rendering order list:", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
// CANCEL ORDER
// ========================================================================================
// Cancels a user's order, updating the order status and processing any necessary refunds.
// ========================================================================================
export const cancelOrder = async (req, res) => {
  try {
    const { token } = req;
    const { orderId, productId, variantId, quantity } = req.body;
    if (!token) {
      return res.redirect("user/home");
    }

    if (!productId || !variantId || !orderId || !quantity) {
      return res.status(400).json({ success: false, message: "Missing data." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const variant = await product.variants.id(variantId);
    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "Product variant is missing." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order list not found." });
    }

    const productInOrder = order.products.find(
      (item) =>
        item.product_id.toString() === productId &&
        item.variant_id.toString() === variantId
    );
    if (!productInOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in the order." });
    }

    if (
      productInOrder.status === "processing" ||
      productInOrder.status === "pending"
    ) {
      variant.stockQuantity += productInOrder.quantity;

      productInOrder.status = "canceled";
      productInOrder.canceled_at = new Date();

      await Promise.all([product.save(), order.save()]);
    }

    res
      .status(200)
      .json({ success: true, message: "Order canceled successfully" });
  } catch (error) {
    console.error("Error canceling order:", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
// RETURN ORDER
// ========================================================================================
// Processes the return of a user's order, including updating the order status and initiating the return process.
// ========================================================================================
export const returnOrder = async (req, res) => {
  try {
    const { token } = req;
    const { orderId, productId, variantId, quantity } = req.body;
    if (!token) {
      return res.redirect("user/home");
    }

    if (!productId || !variantId || !orderId || !quantity) {
      return res.status(400).json({ success: false, message: "Missing data." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const variant = await product.variants.id(variantId);
    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "Product variant is missing." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order list not found." });
    }

    const productInOrder = order.products.find(
      (item) =>
        item.product_id.toString() === productId &&
        item.variant_id.toString() === variantId
    );
    if (!productInOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in the order." });
    }

    productInOrder.status = "return_req";
    productInOrder.return_reqested_at = new Date();

    await order.save();

    res
      .status(200)
      .json({ success: true, message: "Order return request sent successfully" });
  } catch (error) {
    console.error("Error canceling order:", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
// RENDER ORDER DETAILS PAGE
// ========================================================================================
// Renders the page displaying the details of a specific order, including product information,
// quantities, prices, and the order status.
// ========================================================================================
export const orderDetailsPage = async (req, res) => {
  try {
    const { user, brands, token, cartCount, categories } = req;
    const { orderId, productId, variantId } = req.params;
    if (!token) {
      return res.redirect("/user/home");
    }

    const review = await Review.findOne({
      userId: user.userId,
      productId: productId,
      variantId: variantId,
    });

    const order = await Order.findById(orderId)
      .populate({
        path: "products.product_id",
        select:
          "_id title description categoryId subcategoryId brandId variants",
      })
      .populate("address_id");

    if (!order) {
      return res.redirect("/user/home");
    }

    const product = order.products.find(
      (p) =>
        p.product_id._id.toString() === productId &&
        p.product_id.variants.some(
          (variant) => variant._id.toString() === variantId
        )
    );

    if (!product) {
      return res.redirect("/user/home");
    }

    const variant = product.product_id.variants.find(
      (v) => v._id.toString() === variantId
    );
    if (!variant) {
      return res.redirect("/user/home");
    }

    const address = order.address_id;
    const productStatus = product.status || "Unknown";

    return res.render("user/order-details", {
      user,
      categories,
      review,
      brands,
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
    return res.redirect("user/page-404");
  }
};
