import jwt from "jsonwebtoken";
import Order from "../../models/order.js";
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

        if (validCartProducts.length === 0) {
            return res.redirect("/user/my-cart?message=Product+not+found&uccess=false");  
          }

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


export const placeOrderWithBuyNow = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.redirect('user/login'); 
        }

        let user = null;
        let cart = null;

        const { product_id, quantity } = req.query;

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

        if (!product_id || !quantity) {
            return res.status(400).json({
                success: false,
                message: "Product ID and quantity are required.",
            });
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

        const sendProduct = products.find(product => product._id.toString() === product_id);

        const cartProducts = [{ product_details: sendProduct, quantity }];
        console.log(cartProducts);

        return res.render('user/checkout', {
            user: user,
            categories,
            addresses,
            userDetails,
            products,
            cartProducts
        });

    } catch (error) {
        console.error("Error rendering checkout page:", error);
        return res.status(500).send("Internal Server Error");
    }
}




// Place Order
export const placeOrder = async (req, res) => {
    try {
        const { address_id, cart, grandTotal, payment_method, coupon } = req.body;
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

        let user;
        let userCart;

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            user = decoded;
            userCart = await Cart.findOne({ user_id: user.userId });
        } catch (error) {
            console.error("Invalid token:", error);
            return res.status(401).json({ success: false, message: "Invalid token." });
        }

        if (!address_id || !cart || !payment_method || typeof grandTotal !== 'number') {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const userData = await User.findById(user.userId);
        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const address = await Address.findById(address_id);
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        const products = [];
        const purchasedProductIds = [];

        for (let cartItem of cart) {
            const product = await Product.findById(cartItem.product_id);
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found: ${cartItem.product_id}` });
            }

            if (product.available_quantity < cartItem.quantity) {
                continue; 
            }

            product.available_quantity -= cartItem.quantity;
            await product.save();

            products.push({
                product_id: cartItem.product_id,
                quantity: cartItem.quantity,
                total_amount: cartItem.totalAmount,
                status: 'pending',
            });

            purchasedProductIds.push(cartItem.product_id); 
        }

        const result = await Cart.updateOne(
            { user_id: user.userId },
            { $pull: { products: { product_id: { $in: purchasedProductIds } } } }
        );
        
        if (result.modifiedCount === 0) {
            return res.json({ success: false, message: 'Products not found in cart' });
        }

        const order = new Order({
            user_id: user.userId,
            address_id: address._id,
            products,
            total_order_amount: grandTotal,
            payment_method,
            coupon_applied: coupon || false,
        });

        await order.save();

        res.status(201).json({ success: true, message: "Order placed successfully!", order });
    } catch (error) {
        console.error("Error in place order:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};



