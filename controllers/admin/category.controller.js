import mongoose from "mongoose";
import Category from "../../models/category.model.js";
import Subcategory from '../../models/subcategory.model.js';


// Render Add Category Page
export const renderAddCategoryPage = async (req, res) => {
    try {
        const categories = await Category.find();
        const msg = req.body.msg || null
        res.render("admin/add-category", { categories, msg });
    } catch (error) {
        console.error(error);
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
            .populate("subcategories");

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