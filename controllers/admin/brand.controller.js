import Brand from "../../models/brand.model.js"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Brands
export const renderBrandPage = async (req, res) => {
    try {
        const limit = 5;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const brands = await Brand.find()
        .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)

        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);

        const msg = req.query.msg || null;
        const type = req.query.type || null;

        return res.render("admin/brands", {
            brands,
            currentPage: page,
            totalPages: totalPages,
            msg: msg ? { text: msg, type } : null
        })
    } catch (error) {
        
    }
}

// Brands
export const renderAddBrandPage = async (req, res) => {
    try {
        return res.render("admin/add-new-brand");
    } catch (error) {
        console.error("Error rendering add brand page:", error);
        return res.status(500).send("An error occurred while loading the add brand page.");
    }
}

export const addBrand = async (req, res) => {
    try {
        const { name, description } = req.body; // Get brand name and description from body
        const image = req.file?.filename; // Get the uploaded image filename

        // Check if required fields are present
        if (!name || !image) {
            return res.status(400).send("Brand name and image are required.");
        }

        // Check if the brand already exists
        const findBrand = await Brand.findOne({ brandName: name });

        if (findBrand) {
            // If the brand already exists, return a message
            return res.status(400).send("Brand with this name already exists.");
        }

        // If the brand does not exist, create a new brand
        const newBrand = new Brand({
            brandName: name,
            brandDescription: description, // Add description if required
            brandImage: image, // Save the uploaded image filename
        });

        await newBrand.save();

        // Redirect to brands page after success
        return res.redirect("/admin/brands");
    } catch (error) {
        console.error("Error in adding brand:", error);
        return res.status(500).send("An error occurred while adding the brand.");
    }
};


export const  renderEditBrandPage = async (req, res) => {
    try {
        const { brandId } = req.params
        const brand = await Brand.findById(brandId)

        if (!brand) {
            return res.status(404).send("Brand not found");
        }

        res.render("admin/edit-brand", { brand });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
}




export const editBrand = async (req, res) => {
    try {
      const { brandId } = req.params; // Fetch the brand ID
      const { name, description } = req.body; // Extract form data
  
      const updatedBrandData = {
        brandName: name,
        brandDescription: description,
      };
  
      if (req.file) {
        updatedBrandData.brandImage = req.file.filename;
  
        // Delete old image
        const existingBrand = await Brand.findById(brandId);
        if (existingBrand?.brandImage) {
          const imagePath = path.join(__dirname, "../public/uploads", existingBrand.brandImage);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
      }
  
      // Update the brand
      const updatedBrand = await Brand.findByIdAndUpdate(brandId, updatedBrandData, { new: true });
  
      // Redirect back to brands list
      res.redirect("/admin/brands?msg=Brand updated&type=success");
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  };
  

  export const deleteBrand = async (req, res) => {
    try {
      const { brandId } = req.params;
  
      // Fetch the brand to delete its image
      const brand = await Brand.findById(brandId);
      if (!brand) {
        return res.status(404).send("Brand not found");
      }
  
      // Delete the brand image if it exists
      if (brand.brandImage) {
        const imagePath = path.join(__dirname, "../public/uploads", brand.brandImage);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
  
      // Delete the brand from the database
      await Brand.findByIdAndDelete(brandId);
  
      // Redirect to the brands list with a success message
      res.redirect("/admin/brands?msg=Brand deleted&type=success");
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).send("Server Error");
    }
  };