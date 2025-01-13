import Order from "../../models/order.js";
import User from "../../models/user.model.js";
import Address from "../../models/address.model.js";
import Product from "../../models/product.model.js";


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
          }).map(product => ({
              orderId: order._id,
              userId: order.user_id,
              addressId: order.address_id,
              product: product.product_id,
              quantity: product.quantity,
              totalAmount: product.product_id.price * product.quantity,
              status: product.status
          }))
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
    const { orderId, productId, status } = req.body;

    if (!orderId || !productId || !status) {
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

    const order = await Order.findOne({ _id: orderId, 'products.product_id': productId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order or product not found.' });
    }

    const productInOrder = order.products.find(item => item.product_id.toString() === productId);
    if (!productInOrder) {
      return res.status(404).json({ success: false, message: 'Product not found in the order.' });
    }

    if (status === 'canceled' && productInOrder.status !== 'canceled') {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }

      product.available_quantity += productInOrder.quantity;
      await product.save();
    }

    productInOrder.status = status;
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