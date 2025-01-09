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
            .populate("products.product_id");

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
          'return_req',
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