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
