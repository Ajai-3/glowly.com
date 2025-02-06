import jwt from 'jsonwebtoken';
import dotenv from "dotenv";dotenv.config();
import Cart from "../../models/cart.model.js";
import Brand from "../../models/brand.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import Wishlist from "../../models/wishlist.model.js";


// Render Home Page
export const renderHomePage = async (req, res, next) => {
    try {
        const { user, wishlist, cart, cartCount, cartVariants, categories } = req;


        const products = await Product.find({ isDeleted: false }).populate([
            { path: 'brandId', select: 'name' },
            { path: 'categoryId', select: 'name' },
            { path: 'subcategoryId', select: 'name' }
        ]);
        const brands = await Brand.find({ isListed: true });
        
        const categorizedProducts = categories.reduce((acc, category) => {
            const categoryProducts = products.filter(product => {
                if (!product.categoryId) {
                    console.log(`Product ${product.title} does not have a categoryId`);
                    return false;
                }
                if (product.categoryId._id.toString() === category._id.toString()) {
                    return true;
                } else {
                    console.log(`Category mismatch for product ${product.title}: ${product.categoryId._id.toString()} !== ${category._id.toString()}`);
                    return false;
                }
            });
        
            console.log(`Category: ${category.name}, Category Products:`, categoryProducts);
        
            if (categoryProducts.length > 0) {
                const allVariants = categoryProducts.reduce((acc, product) => {
                    if (product.variants && Array.isArray(product.variants)) {
                        product.variants.forEach(variant => {
                            if (variant.isDeleted === false) {
                                acc.push({
                                    ...variant._doc,
                                    productTitle: product.title,
                                    productId: product._id,
                                    brandName: product.brandId?.name,
                                    categoryName: product.categoryId.name,
                                    subcategoryName: product.subcategoryId?.name,
                                });
                            }
                        });
                    }
                    return acc;
                }, []);
        
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
        next({ statusCode: 500, message: error.message });
    }
};
 