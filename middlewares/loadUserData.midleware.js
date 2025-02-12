import jwt from 'jsonwebtoken'; 
import dotenv from "dotenv";dotenv.config();
import Cart from "../models/cart.model.js";
import Brand from "../models/brand.model.js";
import Wallet from "../models/wallet.model.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Wishlist from "../models/wishlist.model.js";


export const loadUserData = async (req, res, next) => {
    try {
        let user = null;
        let wishlist = [];
        let cartVariants = [];
        let cart = null;
        let wallet = null;
      
        const token = req.cookies.token;
      
        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            user = decoded;
            wishlist = await Wishlist.findOne({ user_id: user.userId })
            cart = await Cart.findOne({ user_id: user.userId });
            wallet = await Wallet.findOne({ user_id: user.userId });
          } catch (error) {
            console.error("Invalid or expired token:", error);
          }
        }
      
        let cartCount = cart?.products?.length || 0;
      
        if (cart && cart.products.length > 0) {
          cartVariants = cart.products
            .filter(product => product.variant_id && !product.variant_id.isDeleted)
            .map(product => product.variant_id.toString());
        }        
      
        let categories = await Category.find({ isListed: true }).populate({
          path: 'subcategories',
          match: { isListed: true },
        }).populate({
          path: 'offerId',
          match: { isActive: true, isDeleted: false },
        });
      
        if (!categories) {
          return next({ statusCode: 404, message: 'Categories not found' });
        }

        let brands = await Brand.find({ isListed: true });
      
        if (!brands) {
          return next({ statusCode: 404, message: 'Brands not found' });
        }

        req.user = user;
        req.token = token;
        req.wallet = wallet;
        req.wishlist = wishlist;
        req.cart = cart;
        req.brands = brands;
        req.cartCount = cartCount;
        req.cartVariants = cartVariants;
        req.categories = categories;
      
        next();
    } catch (error) {
        console.error("Error in loadUserData:", error); 
        next();
    }
}