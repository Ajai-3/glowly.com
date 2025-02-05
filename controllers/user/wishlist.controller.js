import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import dotenv from "dotenv";dotenv.config()
import Cart from "../../models/cart.model.js";
import Brand from "../../models/brand.model.js"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js";
import Wishlist from "../../models/wishlist.model.js";


export const renderWishlistPage = async (req, res, next) => {
    try {
        let { user, wishlist, token, brands, cartCount, cartVariants, categories } = req;

        let wishlistProducts = [];
        const ITEMS_PER_PAGE = 3;
        const page = parseInt(req.query.page) || 1; 

        if (!token) {
            return res.redirect('/home');
        }

        if (wishlist && wishlist.products.length > 0) {
            const totalItems = wishlist.products.length;

            // Sort wishlist products by `added_at` in descending order
            wishlist.products.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));

            // Paginate after sorting
            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;

            wishlistProducts = await Promise.all(
                wishlist.products.slice(startIndex, endIndex).map(async (item) => {
                    const productDetails = await Product.findById(item.product_id);
                    const variantDetails = productDetails?.variants.find(
                        (variant) => variant._id.toString() === item.variant_id.toString()
                    );

                    if (productDetails && variantDetails) {
                        return {
                            product: productDetails,
                            variant: variantDetails,
                            added_at: item.added_at
                        };
                    }
                    return null;
                })
            );
            wishlistProducts = wishlistProducts.filter((item) => item !== null);
        }

        const totalPages = Math.ceil((wishlist ? wishlist.products.length : 0) / ITEMS_PER_PAGE);

        

        return res.render("user/my-wishlist", {
            name: user ? user.name : "",
            user: user,
            categories,
            brands,
            cartVariants,
            wishlistProducts,
            currentPage: page,
            totalPages,
            cartCount,
            wishlist 
        });
    } catch (error) {
        console.error("Error rendering wishlist page", error);
        next({ statusCode: 500, message: error.message });
    }
};




// Add A To Wishlist
export const addToWishlist = async (req, res, next) => {
    try {
        let { user, wishlist, token } = req;
        const { product_id, variant_id } = req.body;
        // const token = req.cookies.token;

        if (!token) {
            return res.redirect('/home');
        }

        if (!mongoose.Types.ObjectId.isValid(product_id) || !mongoose.Types.ObjectId.isValid(variant_id)) {
            return res.status(400).json({ error: 'Invalid product_id or variant_id' });
            // return next({ statusCode: 404, message: 'Categories not found' })
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        } catch (err) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const userId = decoded.userId;

        // let wishlist = await Wishlist.findOne({ user_id: userId });

        if (!wishlist) {
            wishlist = new Wishlist({ user_id: user.userId, products: [] });
            await wishlist.save();
        }

        const isProductInWishlist = wishlist.products.some(
            item =>
                item.product_id.toString() === product_id &&
                item.variant_id.toString() === variant_id
        );

        if (isProductInWishlist) {
            await Wishlist.updateOne(
                { _id: wishlist._id },
                { $pull: { products: { product_id: product_id, variant_id: variant_id } } }
            );
            return res.json({ action: 'removed' });
        } else {
            await Wishlist.updateOne(
                { _id: wishlist._id },
                { $push: { products: { product_id: product_id, variant_id: variant_id } } }
            );
            return res.json({ action: 'added' });
        }

    } catch (error) {
        console.error("Error adding/removing product in wishlist:", error);
        next({ statusCode: 500, message: error.message });
    }
};
