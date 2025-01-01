import jwt from "jsonwebtoken"
import dotenv from "dotenv";dotenv.config();
import Cart from "../../models/cart.model.js";
import Brand from "../../models/brand.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";





export const renderCartPage = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null; 
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
        }  

        const products = await Product.find({ isDeleted: false });
        const brands = await Brand.find({ isListed: true })
        const categories = await Category.find({ isListed: true })
        .populate({
            path: 'subcategories',
            match: { isListed: true },  
        });      
                     

        return res.render("user/cart", {
           name: user ? user.name : "",
           brands,
           products,
           categories
        })
    } catch (error) {
        console.error("Error renderinf cart Page", error);
        return res.status(500).send("Cart Page error")
    }
}

export const addToCart = async (req, res) => {
    const { id } = req.params;
    let { quantity } = req.body;
    quantity = quantity || 1;

    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const userId = decoded.userId;

        let cart = await Cart.findOne({ user_id: userId });

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (quantity > 6) {
            return res.json({ success: false, message: 'Cannot add more than 6 products' });
        }

        if (product.available_quantity < quantity) {
            return res.json({ success: false, message: 'Not enough stock available' });
        }

        if (!cart) {
            cart = new Cart({
                user_id: userId,
                products: [{ product_id: id, quantity }],
            });
            await cart.save();
            const updatedStock = product.available_quantity - quantity;
            await Product.findByIdAndUpdate(id, { available_quantity: updatedStock });
            return res.json({ success: true, message: 'Product added to cart', newAvailableQuantity: updatedStock, });
        } else {
            const existingProduct = cart.products.find(item => item.product_id.equals(id));

            if (existingProduct) {
                existingProduct.quantity += Number(quantity);

                if (existingProduct.quantity > 6) {
                    return res.json({ success: false, message: 'Cannot add more than 6 of this product.' });
                }

                if (product.available_quantity < existingProduct.quantity) {
                    return res.json({ success: false, message: 'Not enough stock available' });
                }

                await cart.save();
                const updatedStock = product.available_quantity - quantity;
                await Product.findByIdAndUpdate(id, { available_quantity: updatedStock });
                return res.json({ success: true, message: 'Product quantity updated in cart', newAvailableQuantity: updatedStock, });
            } else {
                cart.products.push({ product_id: id, quantity });
                await cart.save();
                const updatedStock = product.available_quantity - quantity;
                await Product.findByIdAndUpdate(id, { available_quantity: updatedStock });
                return res.json({ success: true, message: 'Product added to cart', newAvailableQuantity: updatedStock, });
            }
        }

    } catch (error) {
        console.error("Error adding product to cart:", error);
        return res.status(500).json({ success: false, message: "Error adding product to cart" });
    }
};
