import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Brand from "../../models/brand.model.js";
import User from "../../models/user.model.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================================================================
// RENDER BRAND PAGE
// ========================================================================================
// This function renders the "Brand" page for admins, displaying the list of brands,
// their details, and allowing admins to manage brand-related information within the system.
// ========================================================================================
export const renderBrandPage = async (req, res) => {
  try {
    const limit = 5;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const isListed = req.query.isListed;

    const query = {};

    if (search) {
      query.brandName = { $regex: search, $options: "i" };
    }

    if (isListed !== undefined) {
      if (isListed === "true") {
        query.isListed = true;
      } else if (isListed === "false") {
        query.isListed = false;
      }
    }

    const brands = await Brand.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const totalBrands = await Brand.countDocuments(query);
    const totalPages = Math.ceil(totalBrands / limit);
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });

    return res.render("admin/brands", {
      brands,
      currentPage: page,
      totalPages: totalPages,
      search: search,
      isListed,
      admin,
    });
  } catch (error) {
    console.error("Error rendering brands page:", error);
    res.status(500).send("An error occurred while rendering the brands page.");
  }
};
// ========================================================================================
// TOP BRANDS BASED ON SOLD COUNT
// ========================================================================================
// This function displays the top brands sorted by the total number of products sold,
// helping admins identify the highest-performing brands based on sales data.
// ========================================================================================
export const topBrands = async (req, res) => {
  try {
    const topBrands = await Brand.aggregate([
      {
        $group: {
          _id: "$_id",
          name: { $first: "$brandName" },
          totalSold: { $sum: "$soldCount" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);
    res.json(topBrands);
  } catch (error) {
    console.error("Error fetching top brands:", error);
    res.status(500).send("Internal Server Error");
  }
};

// ========================================================================================
// RENDER ADD BRAND PAGE
// ========================================================================================
// This function renders the "Add Brand" page, allowing admins to add new brands to
// the system by providing necessary details such as the brand name and description.
// ========================================================================================

export const renderAddBrandPage = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });
    return res.render("admin/add-new-brand", {
      admin,
    });
  } catch (error) {
    console.error("Error rendering add brand page:", error);
    return res
      .status(500)
      .send("An error occurred while loading the add brand page.");
  }
};

// ========================================================================================
// ADD NEW BRAND
// ========================================================================================
// This function allows admins to add a new brand to the system by providing the necessary
// details such as the brand name, description, and other relevant information.
// ========================================================================================
export const addBrand = async (req, res) => {
  try {
    const { name, description } = req.body;
    const image = req.file?.filename;

    if (!name) {
      return res.status(400).json({ message: "Brand name is required." });
    }
    if (!image) {
      return res.status(400).json({ message: "Image is required." });
    }

    const findBrand = await Brand.findOne({ brandName: name });

    if (findBrand) {
      return res
        .status(400)
        .json({ message: "Brand with this name already exists." });
    }

    const newBrand = new Brand({
      brandName: name,
      brandDescription: description || "",
      brandImage: image,
      soldCount: 0,
    });

    await newBrand.save();

    return res.status(200).json({ message: "Brand added successfully!" });
  } catch (error) {
    console.error("Error in adding brand:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while adding the brand." });
  }
};

// ========================================================================================
// RENDER EDIT BRAND PAGE
// ========================================================================================
// This function renders the "Edit Brand" page, allowing admins to view and modify
// the details of an existing brand, such as name, description, and other attributes.
// ========================================================================================
export const renderEditBrandPage = async (req, res) => {
  try {
    const { brandId } = req.params;
    const brand = await Brand.findById(brandId);
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });

    if (!brand) {
      return res.status(404).send("Brand not found");
    }

    res.render("admin/edit-brand", { brand, admin });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

// ========================================================================================
// EDIT BRAND
// ========================================================================================
// This function allows admins to update the details of an existing brand, including
// the brand's name, description, and other attributes, ensuring the brand information
// is accurate and up-to-date.
// ========================================================================================
export const editBrand = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { name, description } = req.body;

    const updatedBrandData = {
      brandName: name,
      brandDescription: description,
    };

    if (req.file) {
      updatedBrandData.brandImage = req.file.filename;

      // Delete old image
      const existingBrand = await Brand.findById(brandId);
      if (existingBrand?.brandImage) {
        const imagePath = path.join(
          __dirname,
          "../public/uploads",
          existingBrand.brandImage
        );
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }

    const updatedBrand = await Brand.findByIdAndUpdate(
      brandId,
      updatedBrandData,
      { new: true }
    );

    if (updatedBrand) {
      return res.status(200).json({ message: "Brand updated successfully!" });
    } else {
      return res.status(404).json({ message: "Brand not found." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ========================================================================================
// LIST AND UNLIST BRAND (SOFT DELETE/RESTORE)
// ========================================================================================
// This function allows admins to soft delete (unlist) or restore (list) a brand,
// enabling them to manage the visibility of brands without permanently removing them
// from the system.
// ========================================================================================
export const toggleBrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res
        .status(404)
        .json({ success: false, message: "Brand not found." });
    }

    brand.isListed = !brand.isListed;
    brand.deleted_at = brand.isListed ? null : Date.now();

    await brand.save();

    const message = brand.isListed
      ? `Brand "${brand.brandName}" has been listed successfully.`
      : `Brand "${brand.brandName}" has been unlisted successfully.`;

    return res.status(200).json({
      success: true,
      message,
      isListed: brand.isListed,
    });
  } catch (error) {
    console.error("Error toggling list/restore brand:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
