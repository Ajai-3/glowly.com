import jwt from "jsonwebtoken";
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
    let wishlist = [];
    const { filters, page = 1 } = req.query;

    let selectedFilters = {};
    if (filters) {
      selectedFilters = JSON.parse(filters);
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        user = decoded;
        wishlist = await Wishlist.findOne({ user_id: user.userId }).populate(
          "products.product_id"
        );
      } catch (error) {
        console.log("Invalid or expired token:", error);
      }
    }

    const productId = req.params.id;

    const product = await Product.findOne({ _id: productId, isDeleted: false })
      .populate("brand_id")
      .populate("category_id")
      .populate("subcategory_id")
      .populate("offer_id");
    if (!product) {
      return res.status(404).send("Product not found");
    }

    const brands = await Brand.find({ isListed: true });
    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });

    let relatedProducts = await Product.find({
      _id: { $ne: productId },
      subcategory_id: product.subcategory_id,
    }).limit(5);

    if (relatedProducts.length < 5) {
      const additionalProducts = await Product.find({
        _id: {
          $nin: [productId, ...relatedProducts.map((p) => p._id)],
        },
        category_id: product.category_id,
      }).limit(5 - relatedProducts.length);

      relatedProducts = [...relatedProducts, ...additionalProducts];
    }

    return res.render("user/product-page", {
      name: user ? user.name : "",
      user,
      categories,
      product,
      brands,
      wishlist,
      relatedProducts,
      selectedFilters,
      currentPage: parseInt(page),
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

export const renderPageWithCategory = async (req, res) => {
  try {
    let user = null;
    let wishlist = [];
    const { filters, page = 1, limit = 10 } = req.query;

    let selectedFilters = {};
    if (filters) {
      selectedFilters = JSON.parse(filters);
    }

    const token = req.cookies.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        user = decoded;
        wishlist = await Wishlist.findOne({ user_id: user.userId }).populate("products.product_id");
      } catch (error) {
        console.log("Invalid or expired token:", error);
      }
    }

    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found");
    }

    let filterConditions = { category_id: category._id, isDeleted: false };
    let sortOptions = {};

    if (filters) {
      const filterObj = JSON.parse(decodeURIComponent(filters));

      if (filterObj.popularity && filterObj.popularity.length > 0) {
        if (filterObj.popularity.includes("trending")) {
          filterConditions = { ...filterConditions, trending: true };
        }
        if (filterObj.popularity.includes("most-reviewed")) {
          filterConditions = { ...filterConditions, mostReviewed: true };
        }
        if (filterObj.popularity.includes("top-rated")) {
          filterConditions = { ...filterConditions, topRated: true };
        }
      }

      if (filterObj.category && filterObj.category.length > 0) {
        filterConditions = { ...filterConditions, category_id: { $in: filterObj.category } };
      }

      if (filterObj.subcategory && filterObj.subcategory.length > 0) {
        filterConditions = { ...filterConditions, subcategory_id: { $in: filterObj.subcategory } };
      }

      if (filterObj.brand && filterObj.brand.length > 0) {
        filterConditions = { ...filterConditions, brand_id: { $in: filterObj.brand } };
      }

      if (filterObj.price) {
        if (filterObj.price.includes("low-to-high")) {
          sortOptions.price = 1;
        } else if (filterObj.price.includes("high-to-low")) {
          sortOptions.price = -1;
        }
      }

      if (filterObj.rating && filterObj.rating.length > 0) {
        filterConditions.rating = { $gte: Math.max(...filterObj.rating.map(r => parseInt(r))) };
      }

      if (filterObj.alphabetical) {
        if (filterObj.alphabetical.includes("a-z")) {
          sortOptions.title = 1;
        } else if (filterObj.alphabetical.includes("z-a")) {
          sortOptions.title = -1;
        }
      }

      if (filterObj['new-arrivals']) {
        if (filterObj['new-arrivals'].includes('latest')) {
          sortOptions.created_at = -1;
        } else if (filterObj['new-arrivals'].includes('oldest')) {
          sortOptions.created_at = 1;
        }
      }
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(filterConditions).sort(sortOptions).skip(skip).limit(parseInt(limit));
    const totalProducts = await Product.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalProducts / limit);

    if (req.xhr) {
      return res.render("partials/product-list", { products, wishlist, selectedFilters });
    } else {
      const categories = await Category.find({ isListed: true }).populate({
        path: "subcategories",
        match: { isListed: true },
      });

      const subcategories = await Subcategory.find({ isListed: true });
      const brands = await Brand.find({ isListed: true });

      return res.render("user/category", {
        name: user ? user.name : "",
        user: user,
        products,
        categories,
        subcategories,
        brands,
        wishlist,
        categoryId,
        selectedFilters,
        currentPage: parseInt(page),
        totalPages,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};




// Render The Sub Category Only
export const renderPageWithSubcategory = async (req, res) => {
  try {
    let user = null;
    let wishlist = [];

    const token = req.cookies.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        user = decoded;
        wishlist = await Wishlist.findOne({ user_id: user.userId }).populate(
          "products.product_id"
        );
      } catch (error) {
        console.log("Invalid or expired token:", error);
      }
    }

    // Use subcategoryId from req.params instead of subcategoryName
    const { subcategoryId } = req.params;

    // Fetch subcategory using its ID
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory) {
      return res.status(404).send("Subcategory not found");
    }

    // Fetch products related to the subcategory by ID
    const products = await Product.find({
      subcategory_id: subcategory._id,
      isDeleted: false,
    });

    // Fetch all listed categories and their listed subcategories
    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });

    return res.render("user/subcategory", {
      name: user ? user.name : "",
      user: user,
      products,
      subcategory,
      wishlist,
      categories,
    });
  } catch (error) {
    console.error("Error rendering subcategory page", error);
    return res.status(500).send("Error in rendering subcategory");
  }
};

// Product Page Filters
// export const productPageFilters = async (req, res) => {
//     try {
//       let user = null;
//       let wishlist = [];
  
//       const token = req.cookies.token;
  
//       if (token) {
//         try {
//           const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//           user = decoded;
//           wishlist = await Wishlist.findOne({ user_id: user.userId }).populate("products.product_id");
//         } catch (error) {
//           console.log("Invalid or expired token:", error);
//         }
//       }
  
//       const { filters } = req.body;
//       let filterQuery = {};
  
//       // Handle various filter types
//       if (filters.popularity) {
//         if (filters.popularity === "trending") filterQuery = { ...filterQuery, trending: true };
//         if (filters.popularity === "most-reviewed") filterQuery = { ...filterQuery, reviewsCount: { $gte: 10 } };
//         if (filters.popularity === "top-rated") filterQuery = { ...filterQuery, rating: { $gte: 4 } };
//       }
  
//       if (filters.category) filterQuery.category_id = { $in: filters.category };
//       if (filters.subcategory) filterQuery.subcategory_id = { $in: filters.subcategory };
//       if (filters.brand) filterQuery.brand_id = { $in: filters.brand };
//       if (filters.rating) filterQuery.rating = { $gte: filters.rating };
  
//       // Price Sorting
//       let priceSort = 1; // Default: low-to-high
//       if (filters.price && filters.price.length > 0) {
//         const priceFilter = filters.price[0];
//         console.log("Extracted price filter:", priceFilter);
  
//         if (priceFilter === "low-to-high") {
//           priceSort = 1;
//         } else if (priceFilter === "high-to-low") {
//           priceSort = -1;
//         }
//       }
  
//       // Date Sorting (Newest/Oldest)
//       let dateSort = {};
//       if (filters.date === "newest") {
//         dateSort = { created_at: -1 }; // Newest first
//       } else if (filters.date === "oldest") {
//         dateSort = { created_at: 1 }; // Oldest first
//       }
  
//       // Combine price and date sorting in one query
//       let sortQuery = {};
//       if (Object.keys(dateSort).length > 0) {
//         sortQuery = { ...dateSort, price: priceSort }; // Combine date sorting with price sorting
//       } else {
//         sortQuery = { price: priceSort }; // Only price sorting
//       }
  
//       // Fetch the products based on filter and sort
//       const products = await Product.find(filterQuery).sort(sortQuery);
  
//       return res.json({ products, user, wishlist });
  
//     } catch (error) {
//       console.error("Error:", error);
//       return res.status(500).send("Internal Server Error");
//     }
//   };
  