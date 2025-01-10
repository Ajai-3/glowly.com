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

    const product = await Product.findById({ _id: productId, isDeleted: false })
      .populate("brand_id")
      .populate("category_id")
      .populate("subcategory_id")
      .populate("offer_id");
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // const categories = await Category.find({}).populate('subcategories');
    // const brands = await Brand.find({});

    const brands = await Brand.find({ isListed: true });
    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });

    const relatedProducts = await Product.find({
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

      relatedProducts.push(...additionalProducts);
    }

    return res.render("user/product-page", {
      name: user ? user.name : "",
      user,
      categories,
      product,
      brands,
      wishlist,
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

    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found");
    }

    const products = await Product.find({
      category_id: category._id,
      isDeleted: false,
    });

    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });

    const subcategories = await Subcategory.find({ isListed: true });
    const brands = await Brand.find({ isListed: true });
    // console.log(subcategories)
    // console.log(categories)

    return res.render("user/category", {
      name: user ? user.name : "",
      user: user,
      products,
      category,
      wishlist,
      categories,
      subcategories,
      brands,
    });
  } catch (error) {
    console.error("Error in rendering product page with category", error);
    return res.status(500).send("Error in rendering product with category");
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
export const productPageFilters = async (req, res) => {
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

    const { filters } = req.body;
    let filterQuery = {};

    if (filters.popularity) {
      if (filters.popularity === "trending") {
        filterQuery = { ...filterQuery, trending: true };
      }
      if (filters.popularity === "most-reviewed") {
        filterQuery = { ...filterQuery, reviewsCount: { $gte: 10 } };
      }
      if (filters.popularity === "top-rated") {
        filterQuery = { ...filterQuery, rating: { $gte: 4 } };
      }
    }

    if (filters.category) {
      filterQuery.category_id = { $in: filters.category };
    }

    if (filters.subcategory) {
      filterQuery.subcategory_id = { $in: filters.subcategory };
    }

    if (filters.brand) {
      filterQuery.brand_id = { $in: filters.brand };
    }

    if (filters.price) {
      if (filters.price === "low-to-high") {
        const products = await Product.find(filterQuery).sort({ price: 1 });
        return res.json({ products, user, wishlist });
      }
      if (filters.price === "high-to-low") {
        const products = await Product.find(filterQuery).sort({ price: -1 });
        return res.json({ products, user, wishlist });
      }
    }

    if (filters.rating) {
      filterQuery.rating = { $gte: filters.rating };
    }

    if (filters.minPrice && filters.maxPrice) {
      filterQuery.price = { $gte: filters.minPrice, $lte: filters.maxPrice };
    }

    if (filters.newArrivals) {
      if (filters.newArrivals === "latest") {
        filterQuery.created_at = {
          $gte: new Date().setMonth(new Date().getMonth() - 1),
        };
      }
      if (filters.newArrivals === "oldest") {
        filterQuery.created_at = {
          $lt: new Date().setMonth(new Date().getMonth() - 6),
        };
      }
    }

    if (filters.alphabetical) {
      const sortOrder = filters.alphabetical === "a-z" ? 1 : -1;
      const products = await Product.find(filterQuery).sort({
        title: sortOrder,
      });
      return res.json({ products, user, wishlist });
    }

    const products = await Product.find(filterQuery);
    console.log(products)
    return res.json({ products, user, wishlist });


  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
