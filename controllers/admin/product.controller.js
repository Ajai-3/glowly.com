import mongoose from "mongoose";
import User from "../../models/user.model.js";
import Offer from "../../models/offer.model.js";
import Brand from "../../models/brand.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";

// ========================================================================================
// RENDER PRODUCTS PAGE
// ========================================================================================
// This function renders the products page by retrieving product data from the database
// and displaying it based on variants and pagination parameters.
// ========================================================================================
export const renderProductsPage = async (req, res) => {
  try {
    const perPage = 6;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const status = req.query.status || "all";

    const matchConditions = {};

    if (search) {
      matchConditions.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "deleted") {
      matchConditions.isDeleted = true;
    } else if (status === "available") {
      matchConditions.isDeleted = false;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategoryId",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      { $unwind: "$subcategory" },
      {
        $lookup: {
          from: "brands",
          localField: "brandId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        $lookup: {
          from: "offers",
          localField: "offerId",
          foreignField: "_id",
          as: "offer",
        },
      },
      { $unwind: { path: "$offer", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
    ];

    const products = await Product.aggregate(pipeline);

    const allVariants = products.reduce((acc, product) => {
      product.variants.forEach((variant) => {
        acc.push({
          ...variant,
          varientIsDeleted: variant.isDeleted,
          productTitle: product.title,
          brandName: product.brand.brandName,
          categoryName: product.category.name,
          subcategoryName: product.subcategory.name,
          productId: product._id,
          isDeleted: product.isDeleted,
          offerId: product.offer?._id,
          offerName: product.offer?.name,
          offerValue: product.offer?.offerValue,
          offerStartDate: product.offer?.startDate,
          offerEndDate: product.offer?.endDate,
          offerIsActive: product.offer?.isActive,
          offerIsDeleted: product.offer?.isDeleted,
        });
      });
      return acc;
    }, []);

    const paginatedVariants = allVariants.slice(
      (page - 1) * perPage,
      page * perPage
    );

    const totalPages = Math.ceil(allVariants.length / perPage);

    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });

    return res.render("admin/products", {
      variants: paginatedVariants,
      currentPage: page,
      totalPages,
      perPage,
      search,
      status,
      admin,
      queryParams: req.query,
      msg: req.query.msg ? { text: req.query.msg, type: req.query.type } : null,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// ========================================================================================
// RENDER TOP PRODUCTS ON PRODUCT PAGE
// ========================================================================================
// This function retrieves and displays the top products on the product page
// based on the product's sold count.
// ========================================================================================
export const topProducts = async (req, res) => {
  try {
    const topProducts = await Product.aggregate([
      { $unwind: "$variants" },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$title" },
          totalSold: { $sum: "$variants.soldCount" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);
    res.json(topProducts);
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ========================================================================================
// RENDER ADD PRODUCTS PAGE
// ========================================================================================
// This function renders the "Add Product" page for admins, allowing
// them to input and submit new product details to be added to the system.
// ========================================================================================
export const renderAddProductsPage = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });
    const brands = await Brand.find({ isListed: true });
    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });

    const msg = req.query.msg
      ? { text: req.query.msg, type: req.query.type }
      : null;

    return res.render("admin/add-products", {
      brands,
      categories,
      msg,
      admin,
    });
  } catch (error) {
    console.error(
      "Error fetching categories, brands, and subcategories:",
      error
    );
    res.status(500).send("Internal Server Error");
  }
};

// ========================================================================================
// ADD NEW PRODUCT
// ========================================================================================
// This function provides the functionality to allow admins to add
// a new product to the system by inputting the necessary product details.
// ========================================================================================
export const addProduct = async (req, res) => {
  try {
    const {
      productName,
      brand,
      description,
      category,
      subCategory,
      variants,
      shareImages,
    } = req.body;

    if (
      !productName ||
      !brand ||
      !description ||
      !category ||
      !subCategory ||
      !variants
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const parsedVariants = JSON.parse(variants);

    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one variant is required" });
    }

    const sharedImages = req.files.sharedImages
      ? req.files.sharedImages.map((file) => file.path)
      : [];

    const processedVariants = parsedVariants.map((variant, index) => {
      const variantImages =
        shareImages === "true"
          ? sharedImages
          : req.files[`variantImages_${index}`]
          ? req.files[`variantImages_${index}`].map((file) => file.path)
          : [];

      if (variantImages.length === 0) {
        throw new Error(`Images are required for variant ${index + 1}`);
      }

      if (parseFloat(variant.salePrice) >= parseFloat(variant.regularPrice)) {
        throw new Error(
          `Sale price must be less than regular price for variant ${index + 1}.`
        );
      }

      return {
        color: variant.color,
        shade: variant.shade,
        stockQuantity: parseInt(variant.stockQuantity),
        regularPrice: parseFloat(variant.regularPrice),
        salePrice: parseFloat(variant.salePrice),
        salePriceBeforeOffer: parseFloat(variant.salePrice),
        images: variantImages,
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
      product: newProduct,
    });
  } catch (error) {
    console.error("Error in adding product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// ========================================================================================
// RENDER EDIT PRODUCT PAGE
// ========================================================================================
// This function renders the "Edit Product" page for admins, providing
// the interface to view and modify the details of an existing product.
// ========================================================================================
export const renderEditProductPage = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });

    const msg = req.query.msg
      ? { text: req.query.msg, type: req.query.type }
      : null;
    const product = await Product.findById(productId)
      .populate("brandId")
      .populate("categoryId")
      .populate("subcategoryId")
      .exec();

    const brands = await Brand.find();
    const categories = await Category.find().populate("subcategories");
    const variant = product.variants.find(
      (variant) => variant._id.toString() === variantId
    );

    res.render("admin/edit-product", {
      product,
      variant,
      brands,
      categories,
      msg,
      admin,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching product details");
  }
};

// ========================================================================================
// UPDATE PRODUCT
// ========================================================================================
// This function allows admins to update the details of an existing product
// in the system, including fields such as name, price, description, and stock.
// ========================================================================================
export const editProduct = async (req, res) => {
  try {
    const {
      productName,
      brand,
      description,
      category,
      subCategory,
      variantColor,
      variantShade,
      variantRegularPrice,
      variantSalePrice,
      variantStockQuantity,
      removedImages,
    } = req.body;
    const { productId, variantId } = req.params;
    const { variantImages } = req.files;

    if (
      !productName ||
      !brand ||
      !description ||
      !category ||
      !subCategory ||
      !variantColor ||
      !variantShade ||
      !variantRegularPrice ||
      !variantSalePrice ||
      !variantStockQuantity
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const variant = product.variants.find(
      (v) => v._id.toString() === variantId
    );

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    product.title = productName;
    product.description = description;
    product.brandId = new mongoose.Types.ObjectId(brand);
    product.categoryId = new mongoose.Types.ObjectId(category);
    product.subcategoryId = new mongoose.Types.ObjectId(subCategory);

    variant.color = variantColor;
    variant.shade = variantShade;
    variant.regularPrice = variantRegularPrice;
    variant.salePrice = variantSalePrice;
    variant.salePriceBeforeOffer = variantSalePrice,
    variant.stockQuantity = variantStockQuantity;

    if (
      (removedImages && removedImages.length > 0) ||
      (variantImages && variantImages.length > 0)
    ) {
      variant.images = updateVariantImages(
        variant.images,
        removedImages,
        variantImages
      );
    }

    await product.save();
    return res.status(200).json({
      success: true,
      message: "Product and variant updated successfully",
    });
  } catch (err) {
    console.log("Error:", err);
    res.status(500).send("Internal server error");
  }
};
function updateVariantImages(existingImages, removedImages, newImages) {
  let updatedImages = [...existingImages];

  if (removedImages && removedImages.length > 0) {
    removedImages.forEach((removedImage) => {
      const removedImageURL = JSON.parse(removedImage).src;
      const imageIndex = updatedImages.indexOf(removedImageURL);
      if (imageIndex !== -1) {
        updatedImages.splice(imageIndex, 1);
      }
    });
  }

  if (updatedImages.length === 0 && newImages && newImages.length > 0) {
    updatedImages = [];
  }

  if (
    removedImages &&
    removedImages.length > 0 &&
    newImages &&
    newImages.length > 0
  ) {
    let newImagesIndex = 0;
    removedImages.forEach((removedImage) => {
      const removedImageURL = JSON.parse(removedImage).src;
      const imageIndex = updatedImages.indexOf(removedImageURL);
      if (imageIndex !== -1 && newImagesIndex < newImages.length) {
        const newImagePath = newImages[newImagesIndex].path;
        updatedImages[imageIndex] = newImagePath;
        newImagesIndex++;
      }
    });
  }

  if (newImages && newImages.length > 0) {
    let newImagesIndex = 0;
    while (newImagesIndex < newImages.length) {
      updatedImages.push(newImages[newImagesIndex].path);
      newImagesIndex++;
    }
  }

  return updatedImages;
}

// ========================================================================================
// ADD NEW VARIANT PAGE
// ========================================================================================
// This function renders the "Add Variant" page for admins, allowing them to input and
// submit new variants (such as shade, color, or images) for an existing product.
// ========================================================================================
export const addVariantPage = async (req, res) => {
  try {
    const { productId } = req.params;
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });
    const product = await Product.findById(productId)
      .populate("brandId")
      .populate("categoryId")
      .populate("subcategoryId")
      .populate("variants");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.render("admin/add-variant", {
      product,
      admin,
      brands: await Brand.find(),
      categories: await Category.find(),
    });
  } catch (error) {
    console.error("Error in rendering add variant page.", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================================================================
// ADD NEW VARIANT
// ========================================================================================
// This function allows admins to add a new variant (e.g., shade, color, or images)
// to an existing product in the system, expanding the product's available options.
// ========================================================================================
export const addNewVariants = async (req, res) => {
  try {
    const { productId, variants, shareImages } = req.body;

    if (!productId || !variants || variants.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    let parsedVariants;
    try {
      parsedVariants = JSON.parse(variants);
    } catch (error) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON format for variants" });
    }

    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one variant is required" });
    }

    parsedVariants.forEach((variant, index) => {
      if (
        !variant.color ||
        !variant.shade ||
        !variant.stockQuantity ||
        !variant.regularPrice ||
        !variant.salePrice
      ) {
        throw new Error(`Missing required field in variant ${index + 1}`);
      }

      if (
        isNaN(variant.stockQuantity) ||
        parseInt(variant.stockQuantity) <= 0
      ) {
        throw new Error(`Invalid stock quantity for variant ${index + 1}`);
      }

      if (
        isNaN(variant.regularPrice) ||
        parseFloat(variant.regularPrice) <= 0
      ) {
        throw new Error(`Invalid regular price for variant ${index + 1}`);
      }

      if (isNaN(variant.salePrice) || parseFloat(variant.salePrice) <= 0) {
        throw new Error(`Invalid sale price for variant ${index + 1}`);
      }
    });

    const sharedImages = req.files.sharedImages
      ? req.files.sharedImages.map((file) => file.path)
      : [];

      const processedVariants = [];

      for (let index = 0; index < parsedVariants.length; index++) {
        const variant = parsedVariants[index];
      
        const variantImages =
          shareImages === "true"
            ? sharedImages
            : req.files?.[`variantImages_${index}`]
            ? req.files[`variantImages_${index}`].map((file) => file.path)
            : [];
      
        if (variantImages.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: `Images are required for variant ${index + 1}` });
        }
      
        processedVariants.push({
          color: variant.color,
          shade: variant.shade,
          stockQuantity: parseInt(variant.stockQuantity),
          regularPrice: parseFloat(variant.regularPrice),
          salePrice: parseFloat(variant.salePrice),
          salePriceBeforeOffer: parseFloat(variant.salePrice),
          images: variantImages,
        });
      }
      

    product.variants.push(...processedVariants);

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Variants added successfully",
    });
  } catch (error) {
    console.error("Error in adding variant.", error);
    res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

// ========================================================================================
// DELETE PRODUCT (SOFT DELETE)
// ========================================================================================
// This function allows admins to toggle the status of a product, enabling them to soft
// delete (mark as inactive) or restore (reactivate) a product without permanently
// removing it from the system.
// ========================================================================================
export const toggleProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    product.isDeleted = !product.isDeleted;
    product.deletedAt = product.isDeleted ? Date.now() : null;

    await product.save();

    res.status(200).json({
      success: true,
      isDeleted: product.isDeleted,
      message: product.isDeleted ? "Product deleted" : "Product restored",
    });
  } catch (error) {
    console.error("Error toggling product status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================================================================================
// DELETE PRODUCT VARINATS (SOFT DELETE)
// ==========================================================================================
// This function allows admins to toggle the status of product variants,
// enabling or disabling specific variants without permanently removing them from the system.
// ==========================================================================================
export const toggleProductVariant = async (req, res) => {
  try {
    const { productId, variantId, action } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "Variant not found" });
    }

    if (action === "delete") {
      variant.isDeleted = true;
      variant.deletedAt = Date.now();
    } else if (action === "restore") {
      variant.isDeleted = false;
      variant.deletedAt = null;
    }

    await product.save();

    res.status(200).json({
      success: true,
      isDeleted: variant.isDeleted,
      message: variant.isDeleted ? "Variant deleted" : "Variant restored",
    });
  } catch (error) {
    console.error("Error toggling product variant status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================================================================================
// ADD PRODUCT OFFER
// ==========================================================================================
// This function allows admins to apply discount offers to specific products, 
// setting a percentage-based discount and an expiration date. 
// ==========================================================================================
export const addProductOffer = async (req, res) => {
  try {
    const { productId, name, discount, endDate } = req.body;

    if (!productId || !name || !discount || !endDate) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const newOffer = new Offer({
      offerType: "percentage",
      offerValue: discount,
      name,
      startDate: new Date(),
      endDate,
      isActive: true,
      isDeleted: false,
    });

    await newOffer.save();

    const product = await Product.findOne({ _id: productId, isDeleted: false });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    for (const variant of product.variants) {
      if (!variant.salePriceBeforeOffer) {
        variant.salePriceBeforeOffer = variant.salePrice;
      }

      const maxDiscountPercentage = 90;
      const maxDiscountValue = (maxDiscountPercentage / 100) * variant.regularPrice;

      const appliedDiscount = Math.min(variant.regularPrice * (discount / 100), maxDiscountValue);
      const newSalePrice = Math.max(variant.regularPrice - appliedDiscount, 0);

      variant.salePrice = Math.round(newSalePrice);
    }

    product.categoryOffer = "Not applied";
    product.productOffer = "Applied";
    product.offerId = newOffer._id;
    await product.save();
  

    return res.status(200).json({
      success: true,
      message: "Offer applied successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding the offer.",
    });
  }
};

// ==========================================================================================
// REMOVE PRODUCT OFFER
// ==========================================================================================
// This function allows admins to remove an existing discount offer from a product. 
// Once removed, the product will no longer have any discount applied. 
// ==========================================================================================
export const removeProductOffer = async (req, res) => {
    try {
      const productId = req.params.productId;
      const { offerId } = req.body;
  
      if (!offerId) {
        return res.status(400).json({
          success: false,
          message: "Offer ID is required.",
        });
      }
     
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Category not found.",
        });
      }
  
      console.log(product)

      const offer = await Offer.findById(offerId);
      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Offer not found.",
        });
      }
      console.log(offer)
  
      offer.isActive = false;
      offer.isDeleted = true;
      await offer.save();
  
  
 
        for (const variant of product.variants) {
          variant.salePrice = variant.salePriceBeforeOffer;
        }
  
        product.productOffer = "Not applied";
        await product.save();

  
      return res.status(200).json({
        success: true,
        message: "Offer removed and sale prices reverted successfully.",
      });
    } catch (error) {
      console.error("Error removing offer:", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong while removing the offer.",
      });
    }
  };