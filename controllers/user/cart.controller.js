import jwt from "jsonwebtoken"
import Brand from "../../models/brand.model.js"
import Product from "../../models/product.model.js"
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

// Add A Product To Cart 
export const addToCart = async (req, res) => {
    try {
        
        
    } catch (error) {
        console.error("Error in adding products in cart", error);
        return res.status(500).send("Error in add product to cart");
    }
}