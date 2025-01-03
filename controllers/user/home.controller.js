import jwt from 'jsonwebtoken';
import dotenv from "dotenv";dotenv.config();
import Brand from "../../models/brand.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import Wishlist from "../../models/wishlist.model.js";


// Render Home Page
export const renderHomePage = async (req, res) => {
    try { 
        let user = null;
        let wishlist = [];

        const token = req.cookies.token;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
                user = decoded; 
                wishlist = await Wishlist.findOne({ user_id: user.userId }).populate('products.product_id');
            } catch (error) {
                console.log("Invalid or expired token:", error);
            }
        }

        // console.log(user)
        const products = await Product.find({ isDeleted: false });
        const brands = await Brand.find({ isListed: true });
        const categories = await Category.find({ isListed: true })
            .populate({
                path: 'subcategories',
                match: { isListed: true },  
            });

        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1)); 
                [arr[i], arr[j]] = [arr[j], arr[i]]; 
            }
        }
        shuffleArray(products);

        return res.render('user/home', {
            user: user,
            name: user ? user.name : "", 
            brands,
            products,
            wishlist, 
            categories
        });
    } catch (error) {
        console.log("Home page is not loading: ", error);
        res.status(500).send("Server Error");
    }
};

