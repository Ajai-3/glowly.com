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
// export const renderProductsPage = async (req, res) => {
//     try {
//         const perPage = 5;
//         const page = parseInt(req.query.page) || 1;
//         const search = req.query.search || '';
//         const status = req.query.status || 'all';

//         // Base Match Conditions
//         const matchConditions = {};

//         if (search) {
//             matchConditions.$or = [
//                 { 'category.name': { $regex: search, $options: 'i' } },
//                 { 'subcategory.name': { $regex: search, $options: 'i' } },
//                 { 'brand.brandName': { $regex: search, $options: 'i' } },
//                 { title: { $regex: search, $options: 'i' } }
//             ];
//         }

//         if (status === 'deleted') {
//             matchConditions.isDeleted = true;
//         } else if (status === 'available') {
//             matchConditions.isDeleted = false;
//         }

//         // Aggregation Pipeline
//         const pipeline = [
//             { $lookup: { from: 'categories', localField: 'category_id', foreignField: '_id', as: 'category' } },
//             { $unwind: '$category' },
//             { $lookup: { from: 'subcategories', localField: 'subcategory_id', foreignField: '_id', as: 'subcategory' } },
//             { $unwind: '$subcategory' },
//             { $lookup: { from: 'brands', localField: 'brand_id', foreignField: '_id', as: 'brand' } },
//             { $lookup: { from: 'offers', localField: 'offer_id', foreignField: '_id', as: 'offer' } },
//             { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
//             { $unwind: '$brand' },
//             { $match: matchConditions },
//             { $sort: { created_at: -1 } },
//             { $skip: (page - 1) * perPage },
//             { $limit: perPage }
//         ];

//         const products = await Product.aggregate(pipeline);

//         // Count Total Products
//         const totalCount = await Product.aggregate([
//             { $lookup: { from: 'categories', localField: 'category_id', foreignField: '_id', as: 'category' } },
//             { $unwind: '$category' },
//             { $lookup: { from: 'subcategories', localField: 'subcategory_id', foreignField: '_id', as: 'subcategory' } },
//             { $unwind: '$subcategory' },
//             { $lookup: { from: 'brands', localField: 'brand_id', foreignField: '_id', as: 'brand' } },
//             { $unwind: '$brand' },
//             { $match: matchConditions },
//             { $count: 'totalCount' }
//         ]);

//         const totalProducts = totalCount.length > 0 ? totalCount[0].totalCount : 0;
//         const totalPages = Math.ceil(totalProducts / perPage);

//         // Render The Products Page
//         return res.render('admin/products', {
//             products,
//             currentPage: page,
//             totalPages,
//             perPage,
//             search,
//             status,
//             queryParams: req.query,
//             msg: req.query.msg ? { text: req.query.msg, type: req.query.type } : null
//         });
//     } catch (error) {
//         console.error('Error fetching products:', error);
//         return res.status(500).send('Internal Server Error');
//     }
// };

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
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (status === 'deleted') {
            matchConditions.isDeleted = true;
        } else if (status === 'available') {
            matchConditions.isDeleted = false;
        }

        // Aggregation Pipeline
        const pipeline = [
            { $match: matchConditions },
            { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
            { $unwind: '$category' },
            { $lookup: { from: 'subcategories', localField: 'subcategoryId', foreignField: '_id', as: 'subcategory' } },
            { $unwind: '$subcategory' },
            { $lookup: { from: 'brands', localField: 'brandId', foreignField: '_id', as: 'brand' } },
            { $unwind: '$brand' },
            { $sort: { createdAt: -1 } },
        ];

        const products = await Product.aggregate(pipeline);

        // Flatten the products array to get a list of all variants
        const allVariants = products.reduce((acc, product) => {
            product.variants.forEach(variant => {
                acc.push({
                    ...variant,
                    productTitle: product.title,
                    brandName: product.brand.brandName,
                    categoryName: product.category.name,
                    subcategoryName: product.subcategory.name,
                    productId: product._id,
                    isDeleted: product.isDeleted
                });
            });
            return acc;
        }, []);

        // Paginate the variants
        const paginatedVariants = allVariants.slice((page - 1) * perPage, page * perPage);

        // Calculate total pages
        const totalPages = Math.ceil(allVariants.length / perPage);

        // Render The Products Page
        return res.render('admin/products', {
            variants: paginatedVariants,
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


export const topProducts = async (req, res) => {
    try {
        const topProducts = await Product.aggregate([
            { $unwind: "$variants" },
            { $group: { _id: "$_id", name: { $first: "$title" }, totalSold: { $sum: "$variants.soldCount" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);
        res.json(topProducts);
    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).send('Internal Server Error');
    }
};


// Rendre Add Products Page
export const renderAddProductsPage = async (req, res) => {
    try {
        const brands = await Brand.find();
        const categories = await Category.find({ isListed: true }).populate({
            path: 'subcategories',
            match: { isListed: true }, 
        });

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

// Add New Product
export const addProduct = async (req, res) => {
    try {
        const {
            productName,
            brand,
            description,
            category,
            subCategory,
            variants,
            shareImages
        } = req.body;
        // console.log(req.body)

        if (!productName || !brand || !description || !category || !subCategory || !variants) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }



        const parsedVariants = JSON.parse(variants);
        
        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one variant is required' });
        }


        const sharedImages = req.files.sharedImages ? req.files.sharedImages.map(file => file.path) : [];

        const processedVariants = parsedVariants.map((variant, index) => {
            const variantImages = shareImages === 'true' 
                ? sharedImages 
                : (req.files[`variantImages_${index}`] 
                    ? req.files[`variantImages_${index}`].map(file => file.path) 
                    : []);

            if (variantImages.length === 0) {
                throw new Error(`Images are required for variant ${index + 1}`);
            }

            if (parseFloat(variant.salePrice) >= parseFloat(variant.regularPrice)) {
                throw new Error(`Sale price must be less than regular price for variant ${index + 1}.`);
            }

            return {
                color: variant.color,
                shade: variant.shade,
                stockQuantity: parseInt(variant.stockQuantity),
                regularPrice: parseFloat(variant.regularPrice),
                salePrice: parseFloat(variant.salePrice),
                images: variantImages
            };
        });

        const newProduct = new Product({
            title: productName,
            brandId: new mongoose.Types.ObjectId(brand),
            categoryId: new mongoose.Types.ObjectId(category),
            subcategoryId: new mongoose.Types.ObjectId(subCategory),
            description,
            variants: processedVariants,
        });

        await newProduct.save();

        return res.status(200).json({ 
            success: true, 
            message: "Product added successfully",
            product: newProduct
        });
    } catch (error) {
        console.error('Error in adding product:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal Server Error'
        });
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

// Toggle Product Status
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
