import jwt from "jsonwebtoken"
import dotenv from "dotenv";dotenv.config()
import Brand from "../../models/brand.model.js"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js";
import Wishlist from "../../models/wishlist.model.js";




export const renderWishlistPage = async (req, res) => {
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
                     
        return res.render("user/wishlist", {
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

// Add A To Wishlist
export const addToWishlist = async (req, res) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const userId = decoded.userId;
        const productId = req.params.productId;

        const existingWishlist = await Wishlist.findOne({ 
            user_id: userId, 
            product_id: productId 
        });

        if (existingWishlist) {
            await Wishlist.deleteOne({ _id: existingWishlist._id });
            return res.json({ 
                message: 'Product removed from wishlist',
                action: 'removed', 
            });
        }

        const newWishlistItem = new Wishlist({
            user_id: userId,
            product_id: productId,
        });

        await newWishlistItem.save();

        return res.json({ 
            message: 'Product added to wishlist',
            action: 'added', 
        });

    } catch (error) {
        console.error("Error adding products in wishlist", error);
        return res.status(500).send("Error in add to wishlist");
    }
}
