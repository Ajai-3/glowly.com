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
        console.log('Uploaded files:', req.files);

        // Retrieve the existing product from the database
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // If new files are uploaded, replace the old images
        let updatedImages = [];

        if (req.files && req.files.length > 0) {
            // Extract the filenames from the uploaded files
            updatedImages = req.files.map(file => file.filename);
            console.log('New images to be saved:', updatedImages);
        }

        // If no new images were uploaded, keep the existing ones
        if (updatedImages.length === 0) {
            updatedImages = product.product_imgs; // Keep the old images if none were uploaded
            console.log('No new images, keeping existing ones:', updatedImages);
        }

        // Update the product with the new list of images, replace the old ones
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, {
            title: req.body.productName,
            description: req.body.description,
            brand_id: req.body.brand,
            category_id: req.body.category,
            subCategory_id: req.body.subCategory,
            available_quantity: req.body.availableQuantity,
            price: req.body.regularPrice,
            sales_price: req.body.salePrice,
            product_imgs: updatedImages,
        }, { new: true });


        if (updatedProduct && updatedProduct.product_imgs) {
            console.log('Updated product images:', updatedProduct.product_imgs);
            res.redirect('/admin/products?msg=Product%20updated%20successfully&type=success');
        } else {
            res.status(500).send('Error updating product images');
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('Error updating product');
    }
}


