import Brand from "../../models/brand.model.js";
import Review from "../../models/review.model.js";
import Product from "../../models/product.model.js";
import Subcategory from "../../models/subcategory.model.js";

// ========================================================================================
// RENDER PRODUCT PAGE
// ========================================================================================
// Renders the product page, displaying detailed information about a specific product,
// including its description, price, and availability.
// ========================================================================================
export const renderProductPage = async (req, res, next) => {
  try {
    let { user, wishlist, cart, cartCount, cartVariants, categories } = req;
    let reviews = [];

    const productId = req.params.productId;
    const variantId = req.params.variantId;

    reviews = await Review.find({
      productId: productId,
    })
      .populate("userId", "name email profilePic")
      .sort({ createdAt: -1 });

    const brands = await Brand.find({ isListed: true });
    if (cart && cart.products.length > 0) {
      cartVariants = cart.products
        .filter((product) => product.variant_id)
        .map((product) => product.variant_id.toString());
    }

    let product = await Product.findById({
      _id: productId,
      isDeleted: false,
    }).populate("categoryId subcategoryId brandId");

    if (!product) throw new Error("Product not found");
    let variant = product.variants.find(
      (item) => item._id.toString() === variantId && item.isDeleted === false
    );

    if (!variant) {
      product = await Product.findOne({
        "variants._id": variantId,
        isDeleted: false,
      }).populate("categoryId subcategoryId brandId");
      if (!product) throw new Error("Variant not found in any product");
      variant = product.variants.find(
        (item) => item._id.toString() === variantId && item.isDeleted === false
      );
    }

    let relatedVariants = product.variants
      .filter(
        (item) => item._id.toString() !== variantId && item.isDeleted === false
      )
      .map((v) => ({
        ...v.toObject(),
        productId: product._id,
        productTitle: product.title,
      }));

    if (relatedVariants.length < 10) {
      const additionalProducts = await Product.find({
        subcategoryId: product.subcategoryId,
        _id: { $ne: product._id },
        isDeleted: false,
      }).limit(10 - relatedVariants.length);

      relatedVariants = relatedVariants.concat(
        additionalProducts.flatMap((p) =>
          p.variants
            .filter((v) => v.isDeleted === false)
            .map((v) => ({
              ...v.toObject(),
              productId: p._id,
              productTitle: p.title,
            }))
        )
      );
    }

    if (relatedVariants.length < 10) {
      const additionalProducts = await Product.find({
        categoryId: product.categoryId,
        _id: { $ne: product._id },
        isDeleted: false,
      }).limit(10 - relatedVariants.length);

      relatedVariants = relatedVariants.concat(
        additionalProducts.flatMap((p) =>
          p.variants
            .filter((v) => v.isDeleted === false)
            .map((v) => ({
              ...v.toObject(),
              productId: p._id,
              productTitle: p.title,
            }))
        )
      );
    }

    relatedVariants = relatedVariants.slice(0, 10);

    return res.render("user/product-page", {
      name: user ? user.name : "",
      user,
      categories,
      product,
      variant,
      reviews,
      brands,
      wishlist,
      cartCount,
      cartVariants,
      relatedVariants,
      activeVariantId: variantId,
    });
  } catch (error) {
    console.error("Error rendering product page:", error);
    next({ statusCode: 500, message: error.message });
  }
};

// ========================================================================================
// RENDER SHOP PAGE
// ========================================================================================
// Renders the shop page, displaying a list of available products, categories, and filters
// for the user to browse.
// ========================================================================================
export const renderShopPage = async (req, res, next) => {
  try {
    let { user, wishlist, cartCount, cartVariants, categories } = req;

    const page = parseInt(req.query.page) || 1;
    const limit = 32;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
    const searchQuery = req.query.search || "";

    let filterConditions = { isDeleted: false };
    let sortOptions = {};

    // Apply filters
    if (filters.popularity) {
      switch (filters.popularity[0]) {
        case "trending":
          sortOptions["variants.soldCount"] = -1;
          break;
        case "most-reviewed":
          sortOptions.reviewCount = -1;
          break;
        case "top-rated":
          sortOptions.rating = -1;
          sortOptions.reviewCount = -1;
          break;
      }
    }
    if (filters.category) {
      filterConditions.categoryId = { $in: filters.category };
    }
    if (filters.subcategory) {
      filterConditions.subcategoryId = { $in: filters.subcategory };
    }
    if (filters.brand) {
      filterConditions.brandId = { $in: filters.brand };
    }
    if (filters.price) {
      if (filters.price[0] === "low-to-high") {
        sortOptions = { "variants.salePrice": 1 };
      } else if (filters.price[0] === "high-to-low") {
        sortOptions = { "variants.salePrice": -1 };
      }
    }
    if (filters.rating) {
      filterConditions.rating = { $gte: parseInt(filters.rating[0]) };
    }
    if (filters.alphabetical) {
      sortOptions =
        filters.alphabetical[0] === "a-z" ? { title: 1 } : { title: -1 };
    }
    if (filters["new-arrivals"]) {
      sortOptions.createdAt = filters["new-arrivals"][0] === "latest" ? -1 : 1;
    }

    // Apply search query
    if (searchQuery) {
      filterConditions.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { "variants.shade": { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Fetch all products and flatten the variants
    const allProducts = await Product.find(filterConditions)
      .populate("variants")
      .sort(sortOptions);

    allProducts.forEach((product) => {
      product.variants = product.variants.filter(
        (variant) => !variant.isDeleted
      );

      product.variants.sort((a, b) => {
        if (sortOptions["variants.salePrice"] === 1) {
          return a.salePrice - b.salePrice;
        } else if (sortOptions["variants.salePrice"] === -1) {
          return b.salePrice - a.salePrice;
        }
        return 0;
      });
    });

    const allVariants = [];

    allProducts.forEach((product) => {
      product.variants.forEach((variant) => {
        allVariants.push({
          product: product,
          variant: variant,
        });
      });
    });

    const totalVariants = allVariants.length;
    const totalPages = Math.ceil(totalVariants / limit);

    // Paginate variants
    const paginatedVariants = allVariants.slice(
      (page - 1) * limit,
      page * limit
    );

    const subcategories = await Subcategory.find({ isListed: true });
    const brands = await Brand.find({ isListed: true });

    return res.render("user/shop", {
      name: user ? user.name : "",
      user: user,
      products: paginatedVariants.map((item) => item.product),
      variants: paginatedVariants.map((item) => item.variant),
      categories,
      subcategories,
      brands,
      cartCount,
      cartVariants,
      wishlist,
      currentPage: page,
      totalPages,
      filters: JSON.stringify(filters),
      searchQuery,
    });
  } catch (error) {
    console.error(error);
    next({ statusCode: 500, message: error.message });
  }
};
