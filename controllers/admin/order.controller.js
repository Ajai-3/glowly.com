import Order from "../../models/order.js";
import User from "../../models/user.model.js";
import Address from "../../models/address.model.js";
import Product from "../../models/product.model.js";


export const renderOrderPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
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

            console.log(orders)

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
