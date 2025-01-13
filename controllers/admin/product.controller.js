import sharp from "sharp"
import fs from 'fs';
import path from 'path';
import mongoose from "mongoose"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js"
import Subcategory from "../../models/subcategory.model.js"
import Brand from "../../models/brand.model.js"

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const uploadDir = path.resolve(process.cwd(), 'public/uploads'); 

// Rendre Products Page
export const renderProductsPage = async (req, res) => {
    try {
        const perPage = 5;
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const status = req.query.status || 'all';

        // Base Match Conditions
        const matchConditions = {};

        if (search) {
            matchConditions.$or = [
                { 'category.name': { $regex: search, $options: 'i' } },
                { 'subcategory.name': { $regex: search, $options: 'i' } },
                { 'brand.brandName': { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } }
            ];
        }

        if (status === 'deleted') {
            matchConditions.isDeleted = true;
        } else if (status === 'available') {
            matchConditions.isDeleted = false;
        }

        // Aggregation Pipeline
        const pipeline = [
            { $lookup: { from: 'categories', localField: 'category_id', foreignField: '_id', as: 'category' } },
            { $unwind: '$category' },
            { $lookup: { from: 'subcategories', localField: 'subcategory_id', foreignField: '_id', as: 'subcategory' } },
            { $unwind: '$subcategory' },
            { $lookup: { from: 'brands', localField: 'brand_id', foreignField: '_id', as: 'brand' } },
            { $lookup: { from: 'offers', localField: 'offer_id', foreignField: '_id', as: 'offer' } },
            { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
            { $unwind: '$brand' },
            { $match: matchConditions },
            { $sort: { created_at: -1 } },
            { $skip: (page - 1) * perPage },
            { $limit: perPage }
        ];

        const products = await Product.aggregate(pipeline);

        // Count Total Products
        const totalCount = await Product.aggregate([
            { $lookup: { from: 'categories', localField: 'category_id', foreignField: '_id', as: 'category' } },
            { $unwind: '$category' },
            { $lookup: { from: 'subcategories', localField: 'subcategory_id', foreignField: '_id', as: 'subcategory' } },
            { $unwind: '$subcategory' },
            { $lookup: { from: 'brands', localField: 'brand_id', foreignField: '_id', as: 'brand' } },
            { $unwind: '$brand' },
            { $match: matchConditions },
            { $count: 'totalCount' }
        ]);

        const totalProducts = totalCount.length > 0 ? totalCount[0].totalCount : 0;
        const totalPages = Math.ceil(totalProducts / perPage);

        // Render The Products Page
        return res.render('admin/products', {
            products,
            currentPage: page,
            totalPages,
            perPage,
            search,
            status,
            queryParams: req.query,
            msg: req.query.msg ? { text: req.query.msg, type: req.query.type } : null
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).send('Internal Server Error');
    }
};




// Rendre Add Products Page
export const renderAddProductsPage = async (req, res) => {
    try {
        const brands = await Brand.find();
        const categories = await Category.find().populate('subcategories');

        const msg = req.query.msg ? { text: req.query.msg, type: req.query.type } : null;

        return res.render("admin/add-products", {
            brands,
            categories,
            msg,
        });
    } catch (error) {
        console.error("Error fetching categories, brands, and subcategories:", error);
        res.status(500).send("Internal Server Error");
    }
};


// Add Ne Product
export const addProduct = async (req, res) => {
    try {
        const {
            productName,
            brand,
            description,
            category,
            subCategory,
            availableQuantity,
            regularPrice,
            salePrice,
        } = req.body;

        if (
            !productName ||
            !brand ||
            !description ||
            !category ||
            !subCategory ||
            !availableQuantity ||
            !regularPrice ||
            !salePrice
        ) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No product images uploaded' });
        }

        // Ensure Upload Directory Exists
        if (!fs.existsSync(uploadDir)) {
            await fs.promises.mkdir(uploadDir, { recursive: true });
        }

        // Resize And Store Product Images
        const productImages = await Promise.all(
            req.files.map(async (file) => {
                try {
                    const resizedOutputPath = path.join(uploadDir, 'resized_' + file.filename);
        
                    await sharp(file.path)
                        .resize(300, 300)
                        .jpeg({ quality: 100 })
                        .toFile(resizedOutputPath);
        
                    return 'resized_' + file.filename;
                } catch (err) {
                    console.error('Error resizing image:', err);
                    throw new Error('Error processing image');
                }
            })
        );


        const newProduct = new Product({
            title: productName,
            brand_id: new mongoose.Types.ObjectId(brand),
            category_id: new mongoose.Types.ObjectId(category),
            subcategory_id: new mongoose.Types.ObjectId(subCategory),
            description,
            price: regularPrice,
            sales_price: salePrice,
            available_quantity: availableQuantity,
            product_imgs: productImages,
            created_at: Date.now(),
            updated_at: Date.now(),
        });

        await newProduct.save();

        return res.status(200).json({ success: true, message: "Product added successfull" });
    } catch (error) {
        console.error('Error in adding product:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

// Render Edit Product Page
export const renderEditProductPage = async (req, res) => {
    try {
        const msg = req.query.msg ? { text: req.query.msg, type: req.query.type } : null;
        const product = await Product.findById(req.params.id)
            .populate('brand_id')  
            .populate('category_id') 
            .populate('subcategory_id') 
            .exec();
        
        const brands = await Brand.find();
        const categories = await Category.find().populate('subcategories'); 

        res.render('admin/edit-product', {
            product,
            brands,
            categories,
            msg
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching product details");
    }
};

// Update Product
export const editProduct = async (req, res) => {
    try {
        console.log('Uploaded files:', req.files);

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        const { productName, brand, description, category, subCategory, availableQuantity, regularPrice, salePrice } = req.body;

        // Validate fields
        if (!productName || !brand || !description || !category || !subCategory || !availableQuantity || !regularPrice || !salePrice) {
            return res.redirect('/admin/edit-product/${req.params.id}?msg=Please%20fill%20in%20all%20required%20fields&type=error');
        }


        let updatedImages = [];

        if (req.files && req.files.length > 0) {
            updatedImages = req.files.map(file => file.filename);
        }

        if (updatedImages.length === 0) {
            updatedImages = product.product_imgs; 
        }


        console.log('Request body:', req.body);
        console.log('Subcategory ID:', req.body.subCategory);
        // console.log(req.body.subCategory)
        
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, {
            title: req.body.productName,
            description: req.body.description,
            brand_id: req.body.brand,
            category_id: req.body.category,
            subcategory_id: req.body.subCategory,
            available_quantity: req.body.availableQuantity,
            price: req.body.regularPrice,
            sales_price: req.body.salePrice,
            product_imgs: updatedImages,
        }, { new: true });

        console.log('Updated Product:', updatedProduct);
        if (updatedProduct && updatedProduct.product_imgs) {
            return res.redirect('/admin/products?msg=Product%20updated%20successfully&type=success');
        } else {
            return res.status(404).send('Error updating product images');
        }
    } catch (err) {
        console.log(err);
        // res.redirect('/admin/edit-product?msg=Error20%updating20%product&type=error');
        res.status(500).send('Internal server error');
    }
}




export const toggleProduct = async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      product.isDeleted = !product.isDeleted;
      product.deleted_at = product.isDeleted ? Date.now() : null;
  
      await product.save();
  
      res.status(200).json({
        success: true,
        isDeleted: product.isDeleted,
        message: product.isDeleted ? 'Product deleted' : 'Product restored',
      });
    } catch (error) {
      console.error('Error toggling product status:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };
