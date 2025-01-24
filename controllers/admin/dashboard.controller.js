import User from "../../models/user.model.js"
import Order from "../../models/order.model.js"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js";



export const renderDashboardPage = async (req, res) => {
    try {

        const salesData = await Order.find().sort({ order_placed_at: -1 });

        const userCount = await User.countDocuments({ role: "user" });
        const orderCount = await Order.countDocuments();
        const totalAmount = await Order.aggregate([
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$total_order_amount" }
              }
            }
          ]);
          const total = totalAmount.length > 0 ? totalAmount[0].totalAmount : 0;
          const formattedTotal = `₹  ${total.toLocaleString()}`;

          const productIds = [...new Set(salesData.flatMap(order => order.products.map(p => p.product_id)))];  
          const products = await Product.find({ '_id': { $in: productIds } }); 
          
          const productMap = products.reduce((map, product) => {
              map[product._id.toString()] = product;
              return map;
          }, {});
          

          const categoryIds = [...new Set(products.map(product => product.category_id))];  
          const categories = await Category.find({ '_id': { $in: categoryIds } }); 
          
          const categoryMap = categories.reduce((map, category) => {
              map[category._id.toString()] = category.name; 
              return map;
          }, {});
          
          // Fetching user names by user IDs
          const userIds = [...new Set(salesData.map(order => order.user_id))];
          const users = await User.find({ '_id': { $in: userIds } });
          
          const userMap = users.reduce((map, user) => {
              map[user._id.toString()] = user;
              return map;
          }, {});
          
          return res.render("admin/dashboard", { 
              salesData,
              userCount,
              orderCount,
              products,
              totalAmount: formattedTotal,
              productMap,
              categoryMap,
              userMap
          });
    } catch (error) {
        console.error("Error fetching sales data:", error);
        return res.status(500).send("Internal Server Error");
    }
};