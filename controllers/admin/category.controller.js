import cron from "node-cron"
import mongoose from "mongoose";
import Offer from "../../models/offer.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import Subcategory from '../../models/subcategory.model.js';


// Render Add Category Page
export const renderAddCategoryPage = async (req, res) => {
    console.log("renderAddCategoryPage function called");
    try {
        console.log("Before the Category query");
        const categories = await Category.find().populate('offerId');
        console.log("After the Category query");
        console.log("Categories:", categories); 
        const msg = req.body.msg || null;
        res.render("admin/add-category", { categories, msg });
    } catch (error) {
        console.error("Error fetching categories:", error); 
        res.status(500).send("Error fetching categories");
    }
};

export const renderCategoryPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const CategoryData = await Category.find({})
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .populate("subcategories")
            .populate({
                path: 'offerId',
                match: { isActive: true },
            });

        const totalCategories = await Category.countDocuments();

        const totalPages = Math.ceil(totalCategories / limit);
        const msg = req.query.msg || null;
        const type = req.query.type || null;
        return res.render("admin/category", {
            category: CategoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            queryParams: req.query,
            msg: msg ? { text: msg, type } : null,
        });
    } catch (error) {
        console.error("Error in fetching Category page:", error);
    }
};


export const addCategory = async (req, res) => {
    try {
        const { categoryName, description, subcategoryName, subcategoryDescription } = req.body;

        // Ensure that all required fields are provided
        if (!categoryName || !description || !subcategoryName || !subcategoryDescription) {
            return res.status(400).send("All fields (category and subcategory) are required");
        }

        const existingCategory = await Category.findOne({ 
            name: { $regex: `^${categoryName}$`, $options: "i" } 
        });
        
        if (existingCategory) {
            return res.status(400).send("Category already exists");
        }
        
        
        // Create the new category first
        const newCategory = new Category({
            name: categoryName,
            description: description,
            subcategories: []  
        });

        await newCategory.save();

        const newSubcategory = new Subcategory({
            name: subcategoryName,
            description: subcategoryDescription,
            categoryId: newCategory._id
        });

        await newSubcategory.save();

        // Add the subcategory's ID to the category's subcategories array
        newCategory.subcategories.push(newSubcategory._id);

        await newCategory.save();

        res.redirect('/admin/category?msg=Category and Subcategory added successfully&type=success');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding category and subcategory");
    }
};

// Add Sub Category To Existing CAtegory
export const addSubcategoryToExistingCategory = async (req, res) => {
    try {
        const { categoryId, subcategoryName, subcategoryDescription } = req.body;

        if (!categoryId || !subcategoryName || !subcategoryDescription) {
            return res.status(400).send("All fields are required");
        }

        const category = await Category.findById(categoryId).populate('subcategories');
        if (!category) {
            return res.status(404).send("Category not found");
        }

        const duplicateSubcategory = category.subcategories.find(
            (subcategory) => subcategory.name.toLowerCase() === subcategoryName.toLowerCase()
        );

        if (duplicateSubcategory) {
            return res.status(400).send("Sub Category already exists");
        }

        const newSubcategory = new Subcategory({
            name: subcategoryName,
            description: subcategoryDescription,
            categoryId: category._id,
        });

        await newSubcategory.save();
        category.subcategories.push(newSubcategory._id);
        await category.save();

        res.redirect(`/admin/category?msg=Subcategory added successfully&type=success`);
    } catch (error) {
        console.error("Error adding subcategory:", error);
        res.status(500).send("Error adding subcategory");
    }
};

// Edit Category Page
export const renderEditCategoryPage = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).send("Category not found");
        }


        const msg = req.query.msg || null; 

        res.render('admin/edit-category', { category, msg });
    } catch (error) {
        console.error("Error fetching category for editing:", error);
        res.status(500).send("Error fetching category for editing");
    }
};

// Update Category 
export const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, description } = req.body;

        const existingCategory = await Category.findOne({ name, _id: { $ne: categoryId } });

        if (existingCategory) {
            return res.status(400).json({
                msg: "Category name already exists",
                type: "error"
            });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { name, description },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                msg: "Category not found",
                type: "error"
            });
        }

        res.json({
            msg: "Category updated successfully",
            type: "success"
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({
            msg: "Error updating category",
            type: "error"
        });
    }
};


// List Unlist Category
export const toggleCategory = async (req, res) => {
    try {
      const categoryId = req.params.id;
      const category = await Category.findById(categoryId);
  
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
  
      category.isListed = req.body.isListed;
  
      if (!category.isListed) {
        category.deleted_at = Date.now();
      } else {
        category.deleted_at = null;
      }
  
      await category.save();
      return res.json({ message: "Category status updated successfully" });
    } catch (error) {
      console.error("Error toggling category: ", error);
      return res.status(500).json({ message: "Server error" });
    }
  };
  
// List Unlist Sub Category
  export const toggleSubcategory = async (req, res) => {
    try {
      const subcategoryId = req.params.id;
      const subcategory = await Subcategory.findById(subcategoryId);
  
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
  
      subcategory.isListed = req.body.isListed;
      await subcategory.save();
  
      return res.json({ message: "Subcategory status updated successfully" });
    } catch (error) {
      console.error("Error toggling subcategory: ", error);
      return res.status(500).json({ message: "Server error" });
    }
  };


export const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const deletedCategory = await Category.findByIdAndDelete(categoryId);

        if (!deletedCategory) {
            return res.status(404).send("Category not found");
        }

        await Subcategory.deleteMany({ categoryId: categoryId });

        res.redirect('/admin/category?msg=Category deleted successfully&type=success');
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).send("Error deleting category");
    }
};



// Add Offer For Category
export const renderAddOfferPage = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const category = await Category.findById(categoryId).populate('subcategories');;

        if (!category) {
            return res.status(404).send("Category not found");
        }

        return res.render('admin/offer', {
            category: category,   
            categoryId: categoryId,
            subCategories: category.subcategories,
        });

    } catch (error) {
        console.error("Error in adding offer in category page", error);
        return res.status(500).send("Server Error")
    }
}




export const addOffer = async (req, res) => {
    try {
        const { categoryId, offerType, offerValue, description, startDate, endDate } = req.body;

        if (!categoryId || !offerType || !offerValue || !description || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required.',
            });
        }

        const category = await Category.findOne({ _id: categoryId });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found.',
            });
        }

        const products = await Product.find({ categoryId: categoryId, isDeleted: false });

        // Apply the offer to the products
        const updatedProducts = products.map(async (product) => {
            product.variants.forEach(async (variant) => {
                let newSalePrice = variant.regularPrice;

                // Apply the offer if applicable
                if (offerType === 'flat') {
                    newSalePrice = variant.regularPrice - offerValue;
                } else if (offerType === 'percentage') {
                    newSalePrice = variant.regularPrice - (variant.regularPrice * (offerValue / 100));
                }

                variant.salePrice = newSalePrice;
            });

            await product.save();
        });

        await Promise.all(updatedProducts);

        // Create the new offer with isActive set to false initially
        const newOffer = new Offer({
            categoryId,
            offerType,
            offerValue,
            name: description,
            startDate,
            endDate,
            isActive: false,  // Offer is inactive when created
        });

        await newOffer.save();

        // Save the offer ID in the category
        category.offerId = newOffer._id;
        await category.save();

        // Cron job to activate the offer when the start date is reached
        cron.schedule('* * * * *', async () => {
            const currentDate = new Date();

            // Activate the offer if the current date is >= startDate
            if (currentDate >= newOffer.startDate && !newOffer.isActive) {
                newOffer.isActive = true;
                await newOffer.save();
                console.log("offer added");

                // Apply offer logic to products
                const products = await Product.find({ categoryId: categoryId, isDeleted: false });
                const updatedProducts = products.map(async (product) => {
                    product.variants.forEach(async (variant) => {
                        let newSalePrice = variant.regularPrice;

                        // Apply the offer
                        if (offerType === 'flat') {
                            newSalePrice = variant.regularPrice - offerValue;
                        } else if (offerType === 'percentage') {
                            newSalePrice = variant.regularPrice - (variant.regularPrice * (offerValue / 100));
                        }

                        variant.salePrice = newSalePrice;
                    });

                    await product.save();
                });

                await Promise.all(updatedProducts);
            }

            // Deactivate the offer if the current date is >= endDate
            if (currentDate >= newOffer.endDate && newOffer.isActive) {
                newOffer.isActive = false;
                await newOffer.save();

                console.log("Offer is false");
                // Revert sale prices to regular prices
                const products = await Product.find({ categoryId: categoryId, isDeleted: false });
                const revertedProducts = products.map(async (product) => {
                    product.variants.forEach(async (variant) => {
                        // Calculate original sale price
                        const originalSalePrice = variant.salePrice / (1 - offerValue / 100);
                        variant.salePrice = originalSalePrice;  // Revert back to the original price
                    });

                    await product.save();
                });

                await Promise.all(revertedProducts);
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Offer applied successfully.',
        });
    } catch (error) {
        console.error('Error adding offer:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while adding the offer.',
        });
    }
};

export const removeOffer = async (req, res) => {
    try {

        const categoryId = req.params.categoryId;


        const { offerId } = req.body;

        if (!offerId) {
            return res.status(400).json({
                success: false,
                message: 'Offer ID is required.',
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found.',
            });
        }


        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found.',
            });
        }

        offer.isActive = false;
        await offer.save();

        const products = await Product.find({ categoryId: category._id, isDeleted: false });

        for (const product of products) {
            for (const variant of product.variants) {
                const originalSalePrice = variant.salePrice / (1 - offer.offerValue / 100);
                console.log(originalSalePrice)
                // variant.salePrice = originalSalePrice;  
                variant.salePrice = (variant.regularPrice - 100);  
            }

            // Save the updated product
            await product.save();
        }

        // Send response indicating successful removal
        return res.status(200).json({
            success: true,
            message: 'Offer removed and sale prices reverted successfully.',
        });
    } catch (error) {
        console.error('Error removing offer:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while removing the offer.',
        });
    }
};
