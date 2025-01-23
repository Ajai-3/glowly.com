import jwt from 'jsonwebtoken';
import dotenv from "dotenv";dotenv.config();
import Cart from "../../models/cart.model.js";
import Brand from "../../models/brand.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import Wishlist from "../../models/wishlist.model.js";


// Render Home Page
export const renderHomePage = async (req, res) => {
    try {
        let user = null;
        let wishlist = [];
        let cartVariants = [];
        let cart;

        const token = req.cookies.token;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
                user = decoded;
                wishlist = await Wishlist.findOne({ user_id: user.userId }).populate('products.product_id');
                cart = await Cart.findOne({ user_id: user.userId });
            } catch (error) {
                console.log("Invalid or expired token:", error);
            }
        }

        const cartCount = cart?.products?.length || 0;

        if (cart && cart.products.length > 0) {
            cartVariants = cart.products
                .filter(product => product.variant_id)
                .map(product => product.variant_id.toString());
        }

        const products = await Product.find({ isDeleted: false }).populate([
            { path: 'brandId', select: 'name' },
            { path: 'categoryId', select: 'name' },
            { path: 'subcategoryId', select: 'name' }
        ]);
        const brands = await Brand.find({ isListed: true });
        const categories = await Category.find({ isListed: true }).populate({
            path: 'subcategories',
            match: { isListed: true },
        });

        // Group products by categories
        const categorizedProducts = categories.reduce((acc, category) => {
            const categoryProducts = products.filter(product => {
                if (!product.categoryId) {
                    console.log(`Product ${product.title} does not have a categoryId`);
                    return false;
                }
                return product.categoryId._id.equals(category._id);
            });
            if (categoryProducts.length > 0) {
                const allVariants = categoryProducts.reduce((acc, product) => {
                    if (product.variants && Array.isArray(product.variants)) {
                        product.variants.forEach(variant => {
                            acc.push({
                                ...variant._doc,
                                productTitle: product.title,
                                productId: product._id,
                                brandName: product.brandId?.name,
                                categoryName: product.categoryId.name,
                                subcategoryName: product.subcategoryId?.name,
                            });
                        });
                    }
                    return acc;
                }, []);

                // Shuffle the variants array
                function shuffleArray(arr) {
                    for (let i = arr.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                    }
                }
                shuffleArray(allVariants);

                acc.push({
                    categoryName: category.name,
                    variants: allVariants.slice(0, 20),
                });
            }
            return acc;
        }, []);

        return res.render('user/home', {
            user: user,
            brands,
            categorizedProducts,
            wishlist,
            cartCount,
            cartVariants,
            categories,
        });
    } catch (error) {
        console.log("Home page is not loading: ", error);
        res.status(500).send("Server Error");
    }
};