import mongoose from "mongoose"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js"
import Subcategory from "../../models/subcategory.model.js"
import Brand from "../../models/brand.model.js"



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


        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / perPage);

        const msg = req.query.msg || null;
        const type = req.query.type || null;
        // Render the page with the populated products
        return res.render("admin/products", {
            products,
            currentPage: page,
            totalPages,
            perPage,
            queryParams: req.query,
            msg: msg ? { text: msg, type } : null
        });
    } catch (error) {
        console.error("Error in fetching products:", error);
        return res.status(500).send("Internal Server Error");
    }
};


// Rendre Add Products Page
export const renderAddProductsPage = async (req, res) => {
    try {

        const brands = await Brand.find()
        const categories = await Category.find()
        const subcategories = await Subcategory.find()

        const msg = req.query.msg ? { text: req.query.msg, type: req.query.type } : null;

        return res.render("admin/add-products", {
            brands,
            categories,
            subcategories,
            msg
        })
    } catch (error) {
        console.error("Error fetching categories, brands, and subcategories:", error);
        res.status(500).send("Internal Server Error");
    }
}

export const addProduct = async (req, res) => {
    try {
        const {
            productName, brand, description, category, subCategory, availableQuantity, regularPrice, salePrice
        } = req.body;

        // Check if files are uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No product images uploaded' });
        }

        // Extract filenames (not the full paths)
        const productImages = req.files.map(file => file.filename);  // Only store the file name (not the full path)

        // Check for missing required fields
        if (!productName || !brand || !description || !category || !subCategory || !availableQuantity || !regularPrice || !salePrice) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Create a new product object
        const newProduct = new Product({
            title: productName,
            brand_id: new mongoose.Types.ObjectId(brand),
            category_id: new mongoose.Types.ObjectId(category),
            subcategory_id: new mongoose.Types.ObjectId(subCategory),
            description: description,
            price: regularPrice,
            sales_price: salePrice,
            available_quantity: availableQuantity,
            product_imgs: productImages,  // Store only filenames (no paths)
            created_at: Date.now(),
            updated_at: Date.now(),
        });

        // Save the product to the database
        await newProduct.save();

        // Send a success response
        return res.redirect('/products?msg=Product%20added%20successfully&type=success');
    } catch (error) {
        console.error("Error in adding product:", error);
        res.status(500).send("Internal Server Error, Error in adding product");
    }
};



export const renderEditProductPage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('brand_id')   // Populate brand
            .populate('category_id') // Populate category
            .populate('subcategory_id') // Populate subcategory
            .exec();
        
        const brands = await Brand.find();
        const categories = await Category.find();
        const subcategories = await Subcategory.find();

        res.render('admin/edit-product', {
            product,
            brands,
            categories,
            subcategories
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching product details");
    }
};


export const editProduct = async (req, res) => {
    try {
        // Handle file uploads if any
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, {
            title: req.body.productName,
            description: req.body.description,
            brand_id: req.body.brand,
            category_id: req.body.category,
            subCategory_id: req.body.subCategory,
            available_quantity: req.body.availableQuantity,
            price: req.body.regularPrice,
            sales_price: req.body.salePrice,
            product_Imgs: req.files ? req.files.map(file => file.filename) : [],  // Assuming images are uploaded
        }, { new: true });

        // Redirect back to the edit page of the updated product
        res.redirect('/admin/products?msg=Product%20updated%20successfully&type=success');
    } catch (err) {
        console.log(err);
        res.status(500).send('Error updating product');
    }
}


