import cron from "node-cron"
import mongoose from "mongoose";
import Offer from "../../models/offer.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import Subcategory from '../../models/subcategory.model.js';


// Render Add Category Page


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
                match: { isActive: true, isDeleted: false },
            });

        const totalCategories = await Category.countDocuments();

        // console.log("Fetched Categories:", JSON.stringify(CategoryData, null, 2));

        
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


export const topCategories = async (req, res) => {
    try {
        const categories = await Category.aggregate([
            { $group: { _id: "$_id", name: { $first: "$name" }, totalSold: { $sum: "$soldCount" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching top categories:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const topSubCategories = async (req, res) => {
    try {
        const subcategories = await Subcategory.aggregate([
            { $group: { _id: "$_id", name: { $first: "$name" }, totalSold: { $sum: "$soldCount" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);
        res.json(subcategories);
    } catch (error) {
        console.error('Error fetching top subcategories:', error);
        res.status(500).send('Internal Server Error');
    }
};


export const renderAddCategoryPage = async (req, res) => {
    try {
        const categories = await Category.find(); 
        const msg = req.body.msg || null;
        res.render("admin/add-category", { categories, msg });
    } catch (error) {
        console.error("Error fetching categories:", error); 
        res.status(500).send("Error fetching categories");
    }
};

export const addCategory = async (req, res) => {
    try {
        const { categoryName, description, subcategoryName, subcategoryDescription } = req.body;

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

        const newOffer = new Offer({
            offerType,
            offerValue,
            name: description,
            startDate,
            endDate,
            isActive: false,
            isDeleted: false,  
        });

        await newOffer.save();

        category.offerId = newOffer._id;
        await category.save();

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

cron.schedule('* * * * *', async () => {
    try {
        const currentDate = new Date().toISOString();

        // Activate offers
        const activeOffers = await Offer.find({ isActive: false, isDeleted: false, startDate: { $lte: currentDate } });

        for (const offer of activeOffers) {
            offer.isActive = true;
            await offer.save();

            const maxDiscountPercentage = 70;

            const category = await Category.findOne({ offerId: offer._id });
            if (!category) {
                console.error(`Category not found for offer ${offer._id}`);
                continue;
            }

            const products = await Product.find({ categoryId: category._id, isDeleted: false });

            for (const product of products) {
                for (const variant of product.variants) {
                    variant.salePriceBeforeOffer = variant.salePrice;
                    let newSalePrice = variant.regularPrice;
                    const maxDiscountValue = (maxDiscountPercentage / 100) * variant.regularPrice;

                    if (offer.offerType === 'flat') {
                        const appliedDiscount = Math.min(offer.offerValue, maxDiscountValue);
                        newSalePrice = Math.max(variant.regularPrice - appliedDiscount, 0); // Ensure price is not negative
                    } else if (offer.offerType === 'percentage') {
                        const appliedDiscount = Math.min(variant.regularPrice * (offer.offerValue / 100), maxDiscountValue);
                        newSalePrice = Math.max(variant.regularPrice - appliedDiscount, 0); // Ensure price is not negative
                    }



                    variant.salePrice = Math.round(newSalePrice);
                }

                await product.save();
            }
        }

        // Deactivate expired offers
        const expiredOffers = await Offer.find({ isActive: true, endDate: { $lte: currentDate } });

        for (const offer of expiredOffers) {
            offer.isActive = false;
            offer.isDeleted = true; 
            await offer.save();

            const category = await Category.findOne({ offerId: offer._id });
            if (!category) {
                console.error(`Category not found for offer ${offer._id}`);
                continue;
            }

            const products = await Product.find({ categoryId: category._id, isDeleted: false });

            for (const product of products) {
                for (const variant of product.variants) {

                    variant.salePrice = variant.salePriceBeforeOffer;
                }
                await product.save();
            }
        }

    } catch (error) {
        console.error('Error in cron job:', error);
    }
});





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

        // Deactivate the offer
        offer.isActive = false;
        await offer.save();

        const maxDiscountPercentage = 70;
        const products = await Product.find({ categoryId: category._id, isDeleted: false });

        for (const product of products) {
            for (const variant of product.variants) {
                

                variant.salePrice = variant.salePriceBeforeOffer;
                console.log("Reverted variant sale price:", variant.salePrice);
            }

            await product.save();
        }

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