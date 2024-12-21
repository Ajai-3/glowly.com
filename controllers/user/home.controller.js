import Product from "../../models/product.model.js"

// Render Home Page
export const renderHomePage = async (req, res) => {
    try {
        const user = req.session.user;

        const products = await Product.find({});

        return res.render('user/home', {
            name: user ? user.name : "",
            products, 
        });
    } catch (error) {
        console.log("Home page is not loading: ", error);
        res.status(500).send("Server Error");
    }
};
