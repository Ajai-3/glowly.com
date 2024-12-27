import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js"
import Brand from "../../models/brand.model.js"
import Subcategory from "../../models/subcategory.model.js"
import Offer from "../../models/offer.model.js"

export const renderProductPage = async (req, res) => {
    try {
        const user = req.session.user;
        const productId = req.params.id;

        const product = await Product.findById({ _id: productId, isDeleted: false })
            .populate('brand_id')
            .populate('category_id')
            .populate('subcategory_id')
            .populate('offer_id');
        if (!product) {
            return res.status(404).send("Product not found");
        }

        // const categories = await Category.find({}).populate('subcategories');
        // const brands = await Brand.find({});

        const brands = await Brand.find({ isListed: true })
        const categories = await Category.find({ isListed: true })
            .populate({
                path: 'subcategories',
                match: { isListed: true },  
            });

        const relatedProducts = await Product.find({
            _id: { $ne: productId },
            subcategory_id: product.subcategory_id,
        }).limit(5);
        

        if (relatedProducts.length < 5) {
            const additionalProducts = await Product.find({
                _id: { 
                    $nin: [productId, ...relatedProducts.map(p => p._id)],
                },
                category_id: product.category_id,
            }).limit(5 - relatedProducts.length);

            relatedProducts.push(...additionalProducts);
        }

        return res.render('user/product-page', {
            name: user ? user.name : "",
            categories,
            product,
            brands,
            relatedProducts,
        });

    } catch (error) {
        console.error("Error rendering product page:", error);
        return res.status(500).send("Server Error");
    }
};



// Render The Page With Category
export const renderPageWithCategory = async (req, res) => {
    try {
        const { categoryName } = req.params;

        const category = await Category.findOne({ name: categoryName }) 

        if (!category) {
            return res.status(404).send('Category not found');
        }

        const products = await Product.find({
            category_id: category._id,
            isDeleted: false
        });

        const categories = await Category.find({ isListed: true })
            .populate({
                path: 'subcategories',
                match: { isListed: true },  
            });

        return res.render("user/category", {
            products,
            category,
            categories,
            name: req.session.user ? req.session.user.name : ""
        });

    } catch (error) {
        console.error("Error in rendering product page with category", error);
        return res.status(500).send("Error in rendering product with category");
    }
}

// Render The Sub Category Only
export const renderPageWithSubcategory = async (req, res) => {
    try {
        const { subcategoryName } = req.params;


        const subcategory = await Subcategory.findOne({ name: subcategoryName });

        if (!subcategory) {
            return res.status(404).send('Subcategory not found');
        }

        const products = await Product.find({
            subcategory_id: subcategory._id,  
            isDeleted: false
        });

        const categories = await Category.find({ isListed: true })
            .populate({
                path: 'subcategories',
                match: { isListed: true },  
            });

        return res.render("user/subcategory", {
            products,
            subcategory,
            categories,
            name: req.session.user ? req.session.user.name : ""
        });

    } catch (error) {
        console.error("Error rendering subcategory page", error);
        return res.status(500).send("Error in rendering subcategory");
    }
};

