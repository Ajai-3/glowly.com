import jwt from "jsonwebtoken"
import Category from "../../models/category.model.js";


export const renderMyAccountPage = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null; 
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
        }  


       
        // const products = await Product.find({ isDeleted: false });
        // const brands = await Brand.find({ isListed: true })
        const categories = await Category.find({ isListed: true })
        .populate({
            path: 'subcategories',
            match: { isListed: true },  
        });      
             
      return res.render("user/my-account", {
        name: user ? user.name : "",

        categories
      })  
    } catch (error) {
        console.error("Error in rendering my account", error);
        return res.status(500).send("Error in my account")
    }
}


export const renderManageAddressPage = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null; 
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
        }  


       
        // const products = await Product.find({ isDeleted: false });
        // const brands = await Brand.find({ isListed: true })
        const categories = await Category.find({ isListed: true })
        .populate({
            path: 'subcategories',
            match: { isListed: true },  
        });      
             
      return res.render("user/manage-address", {
        name: user ? user.name : "",

        categories
      })  
    } catch (error) {
        console.error("Error in rendering my account", error);
        return res.status(500).send("Error in my account")
    }
}