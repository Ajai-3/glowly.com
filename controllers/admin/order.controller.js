import Order from "../../models/order.model.js";
import User from "../../models/user.model.js";
import Wallet from "../../models/wallet.model.js";
import Address from "../../models/address.model.js";
import Product from "../../models/product.model.js";
import Transaction from "../../models/transaction.model.js";


export const renderOrderPage = async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = 5; 
      const skip = (page - 1) * limit;

      const status = req.query.status || 'all'; 

      let query = {};
      
      if (status !== 'all') {
          query['products.status'] = status;
      }

      const orders = await Order.find(query)
          .populate("user_id")
          .populate("address_id")
          .populate("products.product_id")
          .sort({ createdAt: -1 }); 

      const allProducts = orders.flatMap(order => 
          order.products.filter(product => {
              return status === 'all' || product.status === status;
          }).map(product => {
              const variant = product.product_id.variants.find(v => v._id.toString() === product.variant_id.toString());
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
                  variantId: product.variant_id 
              };
          })
      );

      const totalProducts = allProducts.length;
      const totalPages = Math.ceil(totalProducts / limit);

      const paginatedProducts = allProducts.slice(skip, skip + limit);

      const queryParams = req.url.split('?')[1] || '';

      return res.render("admin/orderlists", {
          orders: paginatedProducts,
          currentPage: page,
          totalPages: totalPages,
          queryParams: queryParams,
          status: status,
      });
  } catch (error) {
      console.error("Error in order listing", error);
      res.status(500).send("Internal Server Error");
  }
};



// Update Order Status 
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, productId, variantId, status } = req.body;

    if (!orderId || !productId || !variantId || !status) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const validStatuses = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'canceled',
      'return_req',
      'returned',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const order = await Order.findOne({ _id: orderId, 'products.product_id': productId }).populate('user_id');;
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order or product not found.' });
    }

    const userId = order.user_id._id;


    const productInOrder = order.products.find(item => 
      item.product_id.toString() === productId && 
      item.variant_id.toString() === variantId
    );
    if (!productInOrder) {
      return res.status(404).json({ success: false, message: 'Product not found in the order.' });
    }

    if (status === 'canceled' && productInOrder.status !== 'canceled') {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
      const variant = product.variants.find(v => v._id.toString() === variantId);

      if (!variant) {
        return res.status(404).json({ success: false, message: 'Variant not found in the product.' });
      }

      variant.stockQuantity += productInOrder.quantity;
      await product.save();
    }

    if (status === 'returned' && productInOrder.status !== 'returned') {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
      const variant = product.variants.find(v => v._id.toString() === variantId);

      if (!variant) {
        return res.status(404).json({ success: false, message: 'Variant not found in the product.' });
      }

      variant.stockQuantity += productInOrder.quantity;
      await product.save();
    }

    const product = order.products.find(
      (p) => p.product_id.toString() === productId.toString()
    );
    const refundAmount = product.total_amount;

    productInOrder.status = status;
    if (status === 'processing') {
      productInOrder.processing_at = new Date();  
    } else if (status === 'shipped') {
      productInOrder.shipped_at = new Date();
    } else if (status === 'delivered') {
      productInOrder.delivered_at = new Date();
    } else if (status === 'canceled') {
      productInOrder.canceled_at = new Date();
    } else if (status === 'returned') {
      const wallet = await Wallet.findOne({ user_id: userId });
      wallet.balance += refundAmount;
      await wallet.save();
      const transaction = new Transaction({
        wallet_id: wallet._id,
        user_id: userId,
        transaction_type: "wallet",
        amount: refundAmount,
        type: 'refund',
      });
      await transaction.save();
      productInOrder.returned_at = new Date();
    } 

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Product status updated successfully.',
      order,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};