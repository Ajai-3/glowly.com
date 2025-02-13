import User from "../../models/user.model.js";
import Order from "../../models/order.model.js";
import Wallet from "../../models/wallet.model.js";
import Product from "../../models/product.model.js";
import Transaction from "../../models/transaction.model.js";

// ========================================================================================
// RENDER ORDER PAGE
// ========================================================================================
// This function renders the order page, fetching and displaying the details of orders for
// the admin to view and manage. It handles
// the retrieval of order data and prepares the page for display.
// ========================================================================================
export const renderOrderPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const status = req.query.status || "all";
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });

    let query = {
      payment_status: { $in: ["Payment pending COD", "Payment completed"] },
    };

    const orders = await Order.find(query)
      .populate("user_id")
      .populate("address_id")
      .populate("products.product_id")
      .sort({ createdAt: -1 });

    const allProducts = orders
      .flatMap((order) =>
        order.products
          .filter((product) => {
            return status === "all" || product.status === status;
          })
          .map((product) => {
            if (!product.product_id || !product.product_id.variants) {
              return null;
            }

            const variant = product.product_id.variants.find(
              (v) => v._id.toString() === product.variant_id.toString()
            );

            if (!variant) {
              return null;
            }

            const price = variant ? variant.salePrice : 0;

            return {
              orderId: order._id,
              userId: order.user_id,
              addressId: order.address_id,
              product: product.product_id,
              variant: variant,
              quantity: product.quantity,
              totalAmount: product.total_amount,
              status: product.status,
              variantId: product.variant_id,
              payment_method: order.payment_method,
              payment_status: order.payment_status,
            };
          })
      )
      .filter((product) => product !== null);

    const totalProducts = allProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);

    const paginatedProducts = allProducts.slice(skip, skip + limit);

    const queryParams = req.url.split("?")[1] || "";

    return res.render("admin/orderlists", {
      orders: paginatedProducts,
      currentPage: page,
      totalPages: totalPages,
      queryParams: queryParams,
      status: status,
      admin,
    });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

// ========================================================================================
// UPDATE ORDER STATUS
// ========================================================================================
// This function allows admins to update the status of an order.
// It handles changing the order status (e.g., from 'pending' to 'shipped',
// 'shipped' to 'delivered') based on the order ID and the new status provided.
// ========================================================================================
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, productId, variantId, status } = req.body;

    if (!orderId || !productId || !variantId || !status) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "canceled",
      "return_req",
      "returned",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value." });
    }

    const order = await Order.findOne({
      _id: orderId,
      "products.product_id": productId,
    }).populate("user_id");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order or product not found." });
    }

    const userId = order.user_id._id;

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

    const product = await Product.findById(productId)
      .populate("categoryId")
      .populate("subcategoryId")
      .populate("brandId");

    const brand = product.brandId;
    const category = product.categoryId;
    const subcategory = product.subcategoryId;

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
    const variant = product.variants.find(
      (v) => v._id.toString() === variantId
    );
    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "Variant not found in the product." });
    }

    productInOrder.status = status;
    const refundAmount = productInOrder.amount_after_coupon;

    switch (status) {
      case "processing":
        productInOrder.processing_at = new Date();
        break;
      case "shipped":
        productInOrder.shipped_at = new Date();
        break;
      case "delivered":
        productInOrder.delivered_at = new Date();
        variant.soldCount += productInOrder.quantity;

        brand.soldCount = brand.soldCount || 0;
        category.soldCount = category.soldCount || 0;
        subcategory.soldCount = subcategory.soldCount || 0;

        brand.soldCount += 1;
        category.soldCount += 1;
        subcategory.soldCount += 1;

        await Promise.all([brand.save(), category.save(), subcategory.save()]);

        await product.save();

        break;

      case "canceled":
        productInOrder.canceled_at = new Date();
        variant.stockQuantity += productInOrder.quantity;

        if (variant.stockQuantity < 5) {
          refundAmount * 0.10;
        }

        if (
          order.payment_method === "wallet" ||
          order.payment_method === "razorpay"
        ) {

          const wallet = await Wallet.findOneAndUpdate(
            { user_id: userId },
            {
              $inc: { balance: refundAmount },
              $setOnInsert: { createdAt: new Date(), updatedAt: new Date() },
            },
            { new: true, upsert: true }
          );
          const transaction = new Transaction({
            wallet_id: wallet._id,
            user_id: userId,
            transaction_type: "wallet",
            description: "Order canceled",
            amount: refundAmount,
            type: "Refund",
          });
          await transaction.save();
        }

        await product.save();
        break;
      case "returned":
        const wallet = await Wallet.findOneAndUpdate(
          { user_id: userId },
          {
            $inc: { balance: refundAmount },
            $setOnInsert: { createdAt: new Date(), updatedAt: new Date() },
          },
          { new: true, upsert: true }
        );
        const transaction = new Transaction({
          wallet_id: wallet._id,
          user_id: userId,
          transaction_type: "wallet",
          description: "Order returned",
          amount: refundAmount,
          type: "Refund",
        });
        await transaction.save();
        productInOrder.returned_at = new Date();
        break;
      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid order status." });
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Product status updated successfully.",
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({ success: false, message: "An internal server error occurred." });
  }
};
