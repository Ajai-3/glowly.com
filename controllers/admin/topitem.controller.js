import Brand from "../../models/brand.model.js"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js"
import Subcategory from "../../models/subcategory.model.js"




export const renderTopItemsPage = async (req, res) => {
    try {
        const products = await Product.aggregate([
            { $unwind: "$variants" },
            { $group: { _id: "$_id", name: { $first: "$title" }, totalSold: { $sum: "$variants.soldCount" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);



        const productVariants = await Product.aggregate([
            { $unwind: "$variants" },  
            { 
                $project: {
                    productId: "$_id",
                    variantId: "$variants._id",
                    title: { $concat: ["$title", " - ", "$variants.shade"] }, 
                    totalSold: "$variants.soldCount"
                }
            },
            { $sort: { soldCount: -1 } },  
            { $limit: 10 } 
        ]);

        console.log(products);
        console.log(productVariants)

        const categories = await Category.aggregate([
            { $group: { _id: "$_id", name: { $first: "$name" }, totalSold: { $sum: "$soldCount" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        const subcategories = await Subcategory.aggregate([
            { $group: { _id: "$_id", name: { $first: "$name" }, totalSold: { $sum: "$soldCount" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        const brands = await Brand.aggregate([
            { $group: { _id: "$_id", name: { $first: "$brandName" }, totalSold: { $sum: "$soldCount" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        const topItems = { products, productVariants, categories, subcategories, brands };
        res.render("admin/top-items", { topItems });  
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};








