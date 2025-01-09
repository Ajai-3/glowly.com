import Order from "../../models/order.js";
import User from "../../models/user.model.js";
import Address from "../../models/address.model.js";
import Product from "../../models/product.model.js";


export const renderOrderPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 2;
        const skip = (page - 1) * limit;
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);


        const orders = await Order.find()
            .skip(skip)
            .limit(limit)
            .sort({ 
                createdAt: -1 })
            .populate("user_id")
            .populate("address_id")
            .populate("products.product_id");


        const queryParams = req.url.split('?')[1] || ''; 

        return res.render("admin/orderlists", {
            orders,
            currentPage: page,
            totalPages: totalPages,
            queryParams: queryParams,
        });
    } catch (error) {
        console.error("Error in order listing", error);
    }
};



// Update Order Status 
export const updateOrderStatus  = async (req, res) => {
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
          'return_requested',
          'returned',
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ success: false, message: 'Invalid status value.' });
        }
    
        const updatedOrder = await Order.findOneAndUpdate(
          {
            _id: orderId,
            'products.product_id': productId,
          },
          {
            $set: { 'products.$.status': status },
          },
          { new: true }
        );
    
        if (!updatedOrder) {
          return res.status(404).json({ success: false, message: 'Order or product not found.' });
        }

        console.log(updatedOrder)
    
        res.status(200).json({
          success: true,  
          message: 'Product status updated successfully.',
          updatedOrder,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: 'An internal server error occurred.' });
      }
}