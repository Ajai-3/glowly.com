import jwt from "jsonwebtoken";
import Cart from "../../models/cart.model.js";
import Brand from "../../models/brand.model.js";
import Offer from "../../models/offer.model.js";
import Product from "../../models/product.model.js";
import Wishlist from "../../models/wishlist.model.js";
import Category from "../../models/category.model.js";
import Subcategory from "../../models/subcategory.model.js";

export const renderProductPage = async (req, res) => {
  try {
    const token = req.cookies.token;
    let user = null;
    let cart = null;
    let wishlist = [];
    let cartVariants = [];

    const productId = req.params.productId;
    const variantId = req.params.variantId;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        user = decoded;
        wishlist = await Wishlist.findOne({ user_id: user.userId }).populate("products.product_id");
        cart = await Cart.findOne({ user_id: user.userId });
      } catch (error) {
        console.log("Invalid or expired token:", error);
      }
    }

    const brands = await Brand.find({ isListed: true });
    const cartCount = cart?.products?.length || 0;
    if (cart && cart.products.length > 0) {
      cartVariants = cart.products
        .filter(product => product.variant_id)
        .map(product => product.variant_id.toString());
    }

    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });

    let product = await Product.findById({ _id: productId, isDeleted: false }).populate("categoryId subcategoryId brandId");

    if (!product) throw new Error("Product not found");
    let variant = product.variants.find((item) => item._id.toString() === variantId);

    if (!variant) {
      product = await Product.findOne({ "variants._id": variantId }).populate(
        "categoryId subcategoryId brandId"
      );
      if (!product) throw new Error("Variant not found in any product");
      variant = product.variants.find((item) => item._id.toString() === variantId);
    }

    let relatedVariants = product.variants.filter(item => item._id.toString() !== variantId)
        .map(v => ({ ...v.toObject(), productId: product._id, productTitle: product.title }));

    if (relatedVariants.length < 10) {
      const additionalProducts = await Product.find({
        subcategoryId: product.subcategoryId,
        _id: { $ne: product._id },
        isDeleted: false,
      }).limit(10 - relatedVariants.length);
    
      relatedVariants = relatedVariants.concat(additionalProducts.flatMap(p => p.variants.map(v => ({ ...v.toObject(), productId: p._id, productTitle: p.title }))));
    }
    
    if (relatedVariants.length < 10) {
      const additionalProducts = await Product.find({
        categoryId: product.categoryId,
        _id: { $ne: product._id },
        isDeleted: false,
      }).limit(10 - relatedVariants.length);
    
      relatedVariants = relatedVariants.concat(additionalProducts.flatMap(p => p.variants.map(v => ({ ...v.toObject(), productId: p._id, productTitle: p.title }))));
    }
    
    relatedVariants = relatedVariants.slice(0, 10);

    return res.render("user/product-page", {
      name: user ? user.name : "",
      user,
      categories,
      product,
      variant, 
      brands,
      wishlist,
      cartCount,
      cartVariants,
      relatedVariants,
      activeVariantId: variantId,
    });
  } catch (error) {
    console.error("Error rendering product page:", error);
    return res.status(500).send("Server Error");
  }
};

// Render The Page With Category
// export const renderPageWithCategory = async (req, res) => {
//   try {
//     let user = null;
//     let wishlist = [];

//     const token = req.cookies.token;

//     if (token) {
//       try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//         user = decoded;
//         wishlist = await Wishlist.findOne({ user_id: user.userId }).populate(
//           "products.product_id"
//         );
//       } catch (error) {
//         console.log("Invalid or expired token:", error);
//       }
//     }

//     const { categoryId } = req.params;

//     const category = await Category.findById(categoryId);
//     if (!category) {
//       return res.status(404).send("Category not found");
//     }

//     const products = await Product.find({
//       category_id: category._id,
//       isDeleted: false,
//     });

//     const categories = await Category.find({ isListed: true }).populate({
//       path: "subcategories",
//       match: { isListed: true },
//     });

//     const subcategories = await Subcategory.find({ isListed: true });
//     const brands = await Brand.find({ isListed: true });
//     // console.log(subcategories)
//     // console.log(categories)

//     return res.render("user/category", {
//       name: user ? user.name : "",
//       user: user,
//       products,
//       category,
//       wishlist,
//       categories,
//       subcategories,
//       brands,
//     });
//   } catch (error) {
//     console.error("Error in rendering product page with category", error);
//     return res.status(500).send("Error in rendering product with category");
//   }
// };





// export const renderShopPage = async (req, res) => {
//   try {
//     let user = null;
//     let wishlist = [];
//     const { filters, page = 1, limit = 10 } = req.query;

//     let selectedFilters = {};
//     if (filters) {
//       selectedFilters = JSON.parse(filters);
//     }

//     const token = req.cookies.token;

//     if (token) {
//       try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//         user = decoded;
//         wishlist = await Wishlist.findOne({ user_id: user.userId }).populate("products.product_id");
//       } catch (error) {
//         console.log("Invalid or expired token:", error);
//       }
//     }

//     const { categoryId } = req.params;
//     const category = await Category.findById(categoryId);
//     if (!category) {
//       return res.status(404).send("Category not found");
//     }

//     let filterConditions = { category_id: category._id, isDeleted: false };
//     let sortOptions = {};

//     if (filters) {
//       const filterObj = JSON.parse(decodeURIComponent(filters));

//       if (filterObj.popularity && filterObj.popularity.length > 0) {
//         if (filterObj.popularity.includes("trending")) {
//           filterConditions = { ...filterConditions, trending: true };
//         }
//         if (filterObj.popularity.includes("most-reviewed")) {
//           filterConditions = { ...filterConditions, mostReviewed: true };
//         }
//         if (filterObj.popularity.includes("top-rated")) {
//           filterConditions = { ...filterConditions, topRated: true };
//         }
//       }

//       if (filterObj.category && filterObj.category.length > 0) {
//         filterConditions = { ...filterConditions, category_id: { $in: filterObj.category } };
//       }

//       if (filterObj.subcategory && filterObj.subcategory.length > 0) {
//         filterConditions = { ...filterConditions, subcategory_id: { $in: filterObj.subcategory } };
//       }

//       if (filterObj.brand && filterObj.brand.length > 0) {
//         filterConditions = { ...filterConditions, brand_id: { $in: filterObj.brand } };
//       }

//       if (filterObj.price) {
//         if (filterObj.price.includes("low-to-high")) {
//           sortOptions.price = 1;
//         } else if (filterObj.price.includes("high-to-low")) {
//           sortOptions.price = -1;
//         }
//       }

//       if (filterObj.rating && filterObj.rating.length > 0) {
//         filterConditions.rating = { $gte: Math.max(...filterObj.rating.map(r => parseInt(r))) };
//       }

//       if (filterObj.alphabetical) {
//         if (filterObj.alphabetical.includes("a-z")) {
//           sortOptions.title = 1;
//         } else if (filterObj.alphabetical.includes("z-a")) {
//           sortOptions.title = -1;
//         }
//       }

//       if (filterObj['new-arrivals']) {
//         if (filterObj['new-arrivals'].includes('latest')) {
//           sortOptions.created_at = -1;
//         } else if (filterObj['new-arrivals'].includes('oldest')) {
//           sortOptions.created_at = 1;
//         }
//       }
//     }

//     const skip = (page - 1) * limit;
//     const products = await Product.find(filterConditions).sort(sortOptions).skip(skip).limit(parseInt(limit));
//     const totalProducts = await Product.countDocuments(filterConditions);
//     const totalPages = Math.ceil(totalProducts / limit);

//     if (req.xhr) {
//       return res.render("partials/product-list", { products, wishlist, selectedFilters });
//     } else {
//       const categories = await Category.find({ isListed: true }).populate({
//         path: "subcategories",
//         match: { isListed: true },
//       });

//       const subcategories = await Subcategory.find({ isListed: true });
//       const brands = await Brand.find({ isListed: true });

//       return res.render("user/category", {
//         name: user ? user.name : "",
//         user: user,
//         products,
//         categories,
//         subcategories,
//         brands,
//         wishlist,
//         categoryId,
//         selectedFilters,
//         currentPage: parseInt(page),
//         totalPages,
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Server error");
//   }
// };
export const renderShopPage = async (req, res) => {
  try {
    const token = req.cookies.token;
    let cart = { products: [] };
    let user = null;
    let wishlist = { products: [] };
    let cartVariants = [];

    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
    const searchQuery = req.query.search || '';

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        user = decoded;
        cart = await Cart.findOne({ user_id: user.userId }) || { products: [] };
        wishlist = await Wishlist.findOne({ user_id: user.userId }).populate("products.product_id") || { products: [] };
      } catch (error) {
        console.log("Invalid or expired token:", error);
      }
    }

    if (cart.products.length > 0) {
      cartVariants = cart.products
        .filter(product => product.variant_id)
        .map(product => product.variant_id.toString());
    }
    const cartCount = cart.products.length;

    let filterConditions = { isDeleted: false };
    let sortOptions = {}; // Initialize sortOptions

    // Apply filters
    if (filters.popularity) {
      switch (filters.popularity[0]) {
        case 'trending':
          filterConditions.trending = true;
          break;
        case 'most-reviewed':
          filterConditions.mostReviewed = true;
          break;
        case 'top-rated':
          filterConditions.topRated = true;
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
      const priceRange = filters.price[0].split('-');
      filterConditions.price = { $gte: parseInt(priceRange[0]), $lte: parseInt(priceRange[1]) };
    }
    if (filters.rating) {
      filterConditions.rating = { $gte: parseInt(filters.rating[0]) };
    }
    if (filters.alphabetical) {
      sortOptions = filters.alphabetical[0] === 'a-z' ? { title: 1 } : { title: -1 };
    }
    if (filters["new-arrivals"]) {
      sortOptions.createdAt = filters["new-arrivals"][0] === 'latest' ? -1 : 1;
    }

    // Apply search query
    if (searchQuery) {
      filterConditions.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { 'variants.shade': { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Fetch all products and flatten the variants
    const allProducts = await Product.find(filterConditions).populate('variants').sort(sortOptions);
    const allVariants = [];
    allProducts.forEach(product => {
      product.variants.forEach(variant => {
        allVariants.push({
          product: product,
          variant: variant
        });
      });
    });

    // Calculate total number of variants and adjust pagination
    const totalVariants = allVariants.length;
    const totalPages = Math.ceil(totalVariants / limit);

    // Paginate variants
    const paginatedVariants = allVariants.slice((page - 1) * limit, page * limit);

    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });

    const subcategories = await Subcategory.find({ isListed: true });
    const brands = await Brand.find({ isListed: true });

    return res.render("user/shop", {
      name: user ? user.name : "",
      user: user,
      products: paginatedVariants.map(item => item.product),
      variants: paginatedVariants.map(item => item.variant),
      categories,
      subcategories,
      brands,
      cartCount,
      cartVariants,
      wishlist,
      currentPage: page,
      totalPages,
      filters: JSON.stringify(filters),
      searchQuery
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};



// export const renderShopPage = async (req, res) => {
//   try {
//     const token = req.cookies.token;
//     let cart = { products: [] };
//     let user = null;
//     let wishlist = { products: [] };
//     let cartVariants = [];

//     const page = parseInt(req.query.page) || 1;
//     const limit = 8;
//     const filters = req.query.filters ? JSON.parse(req.query.filters) : {};
//     const searchQuery = req.query.search || '';

//     if (token) {
//       try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//         user = decoded;
//         cart = await Cart.findOne({ user_id: user.userId }) || { products: [] };
//         wishlist = await Wishlist.findOne({ user_id: user.userId }).populate("products.product_id") || { products: [] };
//       } catch (error) {
//         console.log("Invalid or expired token:", error);
//       }
//     }

//     if (cart.products.length > 0) {
//       cartVariants = cart.products
//         .filter(product => product.variant_id)
//         .map(product => product.variant_id.toString());
//     }
//     const cartCount = cart.products.length;
//     let filterConditions = { isDeleted: false };
//     let sortOptions = {}; // Initialize sortOptions

//     // Apply filters
//     if (filters.popularity) {
//       switch (filters.popularity[0]) {
//         case 'trending':
//           filterConditions.trending = true;
//           break;
//         case 'most-reviewed':
//           filterConditions.mostReviewed = true;
//           break;
//         case 'top-rated':
//           filterConditions.topRated = true;
//           break;
//       }
//     }
//     if (filters.category) {
//       filterConditions.categoryId = { $in: filters.category };
//     }
//     if (filters.subcategory) {
//       filterConditions.subcategoryId = { $in: filters.subcategory };
//     }
//     if (filters.brand) {
//       filterConditions.brandId = { $in: filters.brand };
//     }
//     if (filters.price) {
//       const priceRange = filters.price[0].split('-');
//       filterConditions.price = { $gte: parseInt(priceRange[0]), $lte: parseInt(priceRange[1]) };
//     }
//     if (filters.rating) {
//       filterConditions.rating = { $gte: parseInt(filters.rating[0]) };
//     }
//     if (filters.alphabetical) {
//       sortOptions = filters.alphabetical[0] === 'a-z' ? { title: 1 } : { title: -1 };
//     }
//     if (filters["new-arrivals"]) {
//       sortOptions.createdAt = filters["new-arrivals"][0] === 'latest' ? -1 : 1;
//     }

//     // Apply search query
//     if (searchQuery) {
//       filterConditions.$or = [
//         { title: { $regex: searchQuery, $options: 'i' } },
//         { 'variants.shade': { $regex: searchQuery, $options: 'i' } }
//       ];
//     }

//     // Fetch all products and flatten the variants
//     const allProducts = await Product.find(filterConditions).populate('variants').sort(sortOptions);
//     const allVariants = [];
//     allProducts.forEach(product => {
//       product.variants.forEach(variant => {
//         allVariants.push({
//           product: product,
//           variant: variant
//         });
//       });
//     });

//     // Calculate total number of variants and adjust pagination
//     const totalVariants = allVariants.length;
//     const totalPages = Math.ceil(totalVariants / limit);

//     // Paginate variants
//     const paginatedVariants = allVariants.slice((page - 1) * limit, page * limit);

//     const categories = await Category.find({ isListed: true }).populate({
//       path: "subcategories",
//       match: { isListed: true },
//     });

//     const subcategories = await Subcategory.find({ isListed: true });
//     const brands = await Brand.find({ isListed: true });

//     return res.render("user/shop", {
//       name: user ? user.name : "",
//       user: user,
//       products: paginatedVariants.map(item => item.product),
//       variants: paginatedVariants.map(item => item.variant),
//       categories,
//       subcategories,
//       brands,
//       cartCount,
//       cartVariants,
//       wishlist,
//       currentPage: page,
//       totalPages,
//       filters: JSON.stringify(filters),
//       searchQuery
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Server error");
//   }
// };




// export const renderShopPage = async (req, res) => {
//   try {
//     const token = req.cookies.token;
//     let cart = [];
//     let user = null;
//     let wishlist = [];
//     let cartVariants = [];
//     const { filters, page = 1, limit = 10, selectedCategory, selectedSubcategory } = req.query;

//     let selectedFilters = {};
//     if (filters) {
//       selectedFilters = JSON.parse(filters);
//     }

//     if (token) {
//       try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//         user = decoded;
//         cart = await Cart.findOne({ user_id: user.userId });
//         wishlist = await Wishlist.findOne({ user_id: user.userId }).populate("products.product_id");
//       } catch (error) {
//         console.log("Invalid or expired token:", error);
//       }
//     }

//     if (cart && cart.products.length > 0) {
//       cartVariants = cart.products
//           .filter(product => product.variant_id)
//           .map(product => product.variant_id.toString());
//     }
//     const cartCount = cart?.products?.length || 0;
//     let filterConditions = { isDeleted: false };
//     let sortOptions = {};

//     if (selectedCategory) {
//       filterConditions.category_id = selectedCategory;
//     }

//     if (selectedSubcategory) {
//       filterConditions.subcategory_id = selectedSubcategory;
//     }

//     if (filters) {
//       const filterObj = JSON.parse(decodeURIComponent(filters));

//       if (filterObj.popularity && filterObj.popularity.length > 0) {
//         if (filterObj.popularity.includes("trending")) {
//           filterConditions.trending = true;
//         }
//         if (filterObj.popularity.includes("most-reviewed")) {
//           filterConditions.mostReviewed = true;
//         }
//         if (filterObj.popularity.includes("top-rated")) {
//           filterConditions.topRated = true;
//         }
//       }

//       if (filterObj.category && filterObj.category.length > 0) {
//         filterConditions.category_id = { $in: filterObj.category };
//       }

//       if (filterObj.subcategory && filterObj.subcategory.length > 0) {
//         filterConditions.subcategory_id = { $in: filterObj.subcategory };
//       }

//       if (filterObj.brand && filterObj.brand.length > 0) {
//         filterConditions.brand_id = { $in: filterObj.brand };
//       }

//       if (filterObj.price) {
//         if (filterObj.price.includes("low-to-high")) {
//           sortOptions.price = 1;
//         } else if (filterObj.price.includes("high-to-low")) {
//           sortOptions.price = -1;
//         }
//       }

//       if (filterObj.rating && filterObj.rating.length > 0) {
//         filterConditions.rating = { $gte: Math.max(...filterObj.rating.map(r => parseInt(r))) };
//       }

//       if (filterObj.alphabetical) {
//         if (filterObj.alphabetical.includes("a-z")) {
//           sortOptions.title = 1;
//         } else if (filterObj.alphabetical.includes("z-a")) {
//           sortOptions.title = -1;
//         }
//       }

//       if (filterObj['new-arrivals']) {
//         if (filterObj['new-arrivals'].includes('latest')) {
//           sortOptions.created_at = -1;
//         } else if (filterObj['new-arrivals'].includes('oldest')) {
//           sortOptions.created_at = 1;
//         }
//       }
//     }

//     const skip = (page - 1) * limit;
//     const products = await Product.find(filterConditions).sort(sortOptions).skip(skip).limit(parseInt(limit)).populate('variants');
//     const totalProducts = await Product.countDocuments(filterConditions);
//     const totalPages = Math.ceil(totalProducts / limit);

//     const categories = await Category.find({ isListed: true }).populate({
//       path: "subcategories",
//       match: { isListed: true },
//     });

//     const subcategories = await Subcategory.find({ isListed: true });
//     const brands = await Brand.find({ isListed: true });

//     return res.render("user/shop", {
//       name: user ? user.name : "",
//       user: user,
//       products,
//       categories,
//       subcategories,
//       brands,
//       cartCount,
//       cartVariants,
//       wishlist,
//       selectedFilters,
//       selectedCategory,
//       selectedSubcategory,
//       currentPage: parseInt(page),
//       totalPages,
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Server error");
//   }
// };

// // Render The Sub Category Only
// export const renderPageWithSubcategory = async (req, res) => {
//   try {
//     let user = null;
//     let wishlist = [];

//     const token = req.cookies.token;

//     if (token) {
//       try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//         user = decoded;
//         wishlist = await Wishlist.findOne({ user_id: user.userId }).populate(
//           "products.product_id"
//         );
//       } catch (error) {
//         console.log("Invalid or expired token:", error);
//       }
//     }

//     // Use subcategoryId from req.params instead of subcategoryName
//     const { subcategoryId } = req.params;

//     // Fetch subcategory using its ID
//     const subcategory = await Subcategory.findById(subcategoryId);
//     if (!subcategory) {
//       return res.status(404).send("Subcategory not found");
//     }

//     // Fetch products related to the subcategory by ID
//     const products = await Product.find({
//       subcategory_id: subcategory._id,
//       isDeleted: false,
//     });

//     // Fetch all listed categories and their listed subcategories
//     const categories = await Category.find({ isListed: true }).populate({
//       path: "subcategories",
//       match: { isListed: true },
//     });

//     return res.render("user/subcategory", {
//       name: user ? user.name : "",
//       user: user,
//       products,
//       subcategory,
//       wishlist,
//       categories,
//     });
//   } catch (error) {
//     console.error("Error rendering subcategory page", error);
//     return res.status(500).send("Error in rendering subcategory");
//   }
// };

