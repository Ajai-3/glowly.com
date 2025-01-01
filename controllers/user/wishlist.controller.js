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
        //    brands,
        //    products,
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

        let wishlist = await Wishlist.findOne({ user_id: userId });

        if (!wishlist) {
            wishlist = new Wishlist({ user_id: userId, products: [] });
        }

        const isProductInWishlist = wishlist.products.some(item => item.product_id.toString() === productId);

        if (isProductInWishlist) {
            await Wishlist.updateOne(
                { _id: wishlist._id },
                { $pull: { products: { product_id: productId } } }
            );
            return res.json({ action: 'removed' });
        } else {
            await Wishlist.updateOne(
                { _id: wishlist._id },
                { $push: { products: { product_id: productId } } }
            );
            return res.json({ action: 'added' });
        }

    } catch (error) {
        console.error("Error adding/removing product in wishlist", error);
        return res.status(500).send("Error in add/remove to wishlist");
    }
};