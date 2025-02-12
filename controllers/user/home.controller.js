import dotenv from "dotenv";
dotenv.config();
import Brand from "../../models/brand.model.js";
import Product from "../../models/product.model.js";

// ========================================================================================
// RENDER HOME PAGE
// ========================================================================================
// Renders the homepage, displaying featured products, categories, and promotional content.
// ========================================================================================
export const renderHomePage = async (req, res) => {
  try {
    const { user, wishlist, cartCount, cartVariants, categories } = req;

    const products = await Product.find({ isDeleted: false }).populate([
      { path: "brandId", select: "name" },
      { path: "categoryId", select: "name" },
      { path: "subcategoryId", select: "name" },
    ]);
    const brands = await Brand.find({ isListed: true });

    const categorizedProducts = categories.reduce((acc, category) => {
      const categoryProducts = products.filter((product) => {
        if (!product.categoryId) {
          return false;
        }
        if (product.categoryId._id.toString() === category._id.toString()) {
          return true;
        } else {
          return false;
        }
      });

      if (categoryProducts.length > 0) {
        const allVariants = categoryProducts.reduce((acc, product) => {
          if (product.variants && Array.isArray(product.variants)) {
            product.variants.forEach((variant) => {
              if (variant.isDeleted === false) {
                acc.push({
                  ...variant._doc,
                  productTitle: product.title,
                  productId: product._id,
                  brandName: product.brandId?.name,
                  categoryName: product.categoryId.name,
                  subcategoryName: product.subcategoryId?.name,
                });
              }
            });
          }
          return acc;
        }, []);

        function shuffleArray(arr) {
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
        }

        shuffleArray(allVariants);

        acc.push({
          categoryName: category.name,
          variants: allVariants.slice(0, 20),
        });
      }
      return acc;
    }, []);

    return res.render("user/home", {
      user: user,
      brands,
      categorizedProducts,
      wishlist,
      cartCount,
      cartVariants,
      categories,
    });
  } catch (error) {
    console.log("Home page is not loading: ", error);
    return res.redirect("user/page-404");
  }
};
