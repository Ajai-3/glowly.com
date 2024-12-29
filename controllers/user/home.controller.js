import jwt from 'jsonwebtoken';
import Brand from "../../models/brand.model.js"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js";

// Render Home Page
export const renderHomePage = async (req, res) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.decode(token);
        const user = decoded; 
        // console.log("User Name:", user.name); 

        const products = await Product.find({ isDeleted: false });
        const brands = await Brand.find({ isListed: true })
        const categories = await Category.find({ isListed: true })
            .populate({
                path: 'subcategories',
                match: { isListed: true },  
            });
        // const categories = await Category.find({}).populate('subcategories');
        // products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1)); 
              [arr[i], arr[j]] = [arr[j], arr[i]]; 
            }
          }
          
        // Shuffle the products array
        shuffleArray(products);

        return res.render('user/home', {
            name: user ? user.name : "",
            brands,
            products,
            categories
        });
    } catch (error) {
        console.log("Home page is not loading: ", error);
        res.status(500).send("Server Error");
    }
};
