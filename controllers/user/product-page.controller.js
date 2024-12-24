import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js"
import Brand from "../../models/brand.model.js"

export const renderProductPage = async (req, res) => {
    try {
        const user = req.session.user;
        const productId = req.params.id;

        const product = await Product.findById({ _id: productId, isDeleted: false })
            .populate('brand_id')
            .populate('category_id')
            .populate('subcategory_id');
        if (!product) {
            return res.status(404).send("Product not found");
        }

        const categories = await Category.find({}).populate('subcategories');
        const brands = await Brand.find({});

        const relatedProducts = await Product.find({
            _id: { $ne: productId },  // Exclude the current product
            subcategory_id: product.subcategory_id,   // Match the subcategory only
        }).limit(5); 

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
