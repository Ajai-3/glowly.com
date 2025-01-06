import jwt from "jsonwebtoken";
import User from "../../models/user.model.js";
import Cart from "../../models/cart.model.js"; 
import Address from "../../models/address.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";

export const renderCheckoutPage = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.redirect('user/login'); 
        }

        let user = null;
        let cart = null;

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            user = decoded;
            cart = await Cart.findOne({ user_id: user.userId });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.error('JWT expired at:', error.expiredAt);
                return res.redirect('/user/home');
            }
            throw error;
        }

        
        if (!cart) {
            console.log("No cart found for the user, creating a new one.");
            cart = new Cart({
                user_id: user.userId,
                products: [] 
            }); 
        }

        const categories = await Category.find({ isListed: true })
            .populate({
                path: 'subcategories',
                match: { isListed: true },
            });

        const products = await Product.find({ isDeleted: false });
        const addresses = await Address.find({ user_id: user.userId }).limit(3);
        const userDetails = await User.findById(user.userId);

    
        const cartProducts = await Promise.all(
            cart.products
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map(async (cartProduct) => {
                const productDetails = await Product.findById(cartProduct.product_id);
                
                if (productDetails && productDetails.available_quantity > 0 && cartProduct.quantity <= productDetails.available_quantity) {
                  return {
                    ...cartProduct.toObject(),
                    product_details: productDetails
                  };
                }
                return null;
              })
          );
          
        const validCartProducts = cartProducts.filter(product => product !== null);

        return res.render('user/checkout', {
            user: user,
            categories,
            addresses,
            userDetails,
            products,
            cartProducts: validCartProducts,
        });
    } catch (error) {
        console.error("Error rendering checkout page:", error);
        return res.status(500).send("Internal Server Error");
    }
};


// Place Order
export const placeOrder = async (req, res) => {
    try {
        const { address_id, cart, payment_method } = req.body;
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

        let user;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            user = decoded; 
        } catch (error) {
            console.error("Invalid token:", error);
            return res.status(401).json({ success: false, message: "Invalid token." });
        }

        if (!address_id || !cart || !payment_method) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const categories = await Category.find({ isListed: true })
            .populate({
                path: 'subcategories',
                match: { isListed: true },
            });

        console.log("Order Data:", { user, address_id, cart, payment_method });

        res.status(200).json({ success: true, message: "Order placed successfully!" });
    } catch (error) {
        console.error("Error in place order:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const renderOrderListPage = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.redirect('user/home'); 
        }

        let user;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            user = decoded; 
        } catch (error) {
            console.error("Invalid token:", error);
            // return res.json({ success: false, message: 'Invalid token' });
        }

        const categories = await Category.find({ isListed: true })
        .populate({
            path: 'subcategories',
            match: { isListed: true },
        });

        return res.render("user/my-orders", {
            user: user,
            categories
        })

    } catch (error) {
       console.log("Error in rendering order list") 
    }
}