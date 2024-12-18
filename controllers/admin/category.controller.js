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

        return res.render("admin/category", {
            category: CategoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            queryParams: req.query,
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

        // Create the new category first
        const newCategory = new Category({
            name: categoryName,
            description: description,
            subcategories: []  // Initialize with an empty array for subcategories
        });

        // Save the new category to the database
        await newCategory.save();

        // Create the new subcategory and associate it with the newly created category
        const newSubcategory = new Subcategory({
            name: subcategoryName,
            description: subcategoryDescription,
            categoryId: newCategory._id // Link subcategory to the category
        });

        // Save the new subcategory to the database
        await newSubcategory.save();

        // Add the subcategory's ID to the category's subcategories array
        newCategory.subcategories.push(newSubcategory._id);

        // Save the updated category with the new subcategory's ID
        await newCategory.save();

        // Send the success response with a message
        res.redirect('/admin/category?msg=Category and Subcategory added successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding category and subcategory");
    }
};


export const addSubcategoryToExistingCategory = async (req, res) => {
    try {
        const { categoryId, subcategoryName, subcategoryDescription } = req.body;

        if (!categoryId || !subcategoryName || !subcategoryDescription) {
            return res.status(400).send("All fields are required");
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).send("Category not found");
        }

        const newSubcategory = new Subcategory({
            name: subcategoryName,
            description: subcategoryDescription,
            categoryId: category._id,
        });

        await newSubcategory.save();
        category.subcategories.push(newSubcategory._id);
        await category.save();

        res.redirect(`/admin/category?msg=Subcategory added successfully`);
    } catch (error) {
        console.error("Error adding subcategory:", error);
        res.status(500).send("Error adding subcategory");
    }
};

export const renderEditCategoryPage = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).send("Category not found");
        }

        const msg = req.query.msg || null; // Optional query parameter for messages

        res.render('admin/edit-category', { category, msg });
    } catch (error) {
        console.error("Error fetching category for editing:", error);
        res.status(500).send("Error fetching category for editing");
    }
};

export const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, description } = req.body;

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { name, description },
            { new: true } // Returns the updated document
        );

        if (!updatedCategory) {
            return res.status(404).send("Category not found");
        }

        res.redirect('/admin/category?msg=Category updated successfully');
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).send("Error updating category");
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Find and delete the category
        const deletedCategory = await Category.findByIdAndDelete(categoryId);

        if (!deletedCategory) {
            return res.status(404).send("Category not found");
        }

        // Optionally delete related subcategories
        await Subcategory.deleteMany({ categoryId: categoryId });

        // Redirect to categories page with a success message
        res.redirect('/admin/category?msg=Category deleted successfully&type=success');
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).send("Error deleting category");
    }
};

