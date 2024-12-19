import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js"
import Subcategory from "../../models/subcategory.model.js"
import Brand from "../../models/brand.model.js"
import storage from "../../helpers/multer.js"



// Rendre Products Page
export const renderProductsPage = async (req, res) => {
    try {
        const perPage = 5;
        const page = parseInt(req.query.page) || 1;

        // Fetch products with populated category, subcategory, and brand
        const products = await Product.find()
            .sort({ created_at: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate('category_id')   // Populate category
            .populate('subcategory_id') // Populate subcategory
            .populate('brand_id'); // Populate brand

        // Log products to check if data is populated correctly
        console.log(products);

        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / perPage);

        // Render the page with the populated products
        return res.render("admin/products", {
            products,
            currentPage: page,
            totalPages,
            perPage,
            queryParams: req.query,
        });
    } catch (error) {
        console.error("Error in fetching products:", error);
        return res.status(500).send("Internal Server Error");
    }
};


// Rendre Add Products Page
export const renderAddProductsPage  = async (req, res) => {
    try {
     
        const brands = await Brand.find()
        const categories = await Category.find()
        const subcategories = await Subcategory.find()

        return res.render("admin/add-products", {
            brands,
            categories,
            subcategories
        })
    } catch (error) {
        console.error("Error fetching categories, brands, and subcategories:", error);
        res.status(500).send("Internal Server Error");
    }
    
}
// Rendre Edit Products Page
export const renderEditProductsPage  = (req, res) => {
    return res.render("admin/edit-products")
}

// Brands
export const renderAddBrandPage = async (req, res) => {
    return res.render("admin/add-new-brand")
}

export const addBrands = async (req, res) => {
    return res.render("admin/products")
}