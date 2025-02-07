import sharp from "sharp"
import fs from 'fs';
import path from 'path';
import mongoose from "mongoose"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js"
import Subcategory from "../../models/subcategory.model.js"
import Brand from "../../models/brand.model.js"

// const __dirname = path.dirname(new URL(import.meta.url).pathname);
// const uploadDir = path.resolve(process.cwd(), 'public/uploads'); 


export const renderProductsPage = async (req, res) => {
    try {
        const perPage = 5;
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const status = req.query.status || 'all';


        const matchConditions = {};

        if (search) {
            matchConditions.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (status === 'deleted') {
            matchConditions.isDeleted = true;
        } else if (status === 'available') {
            matchConditions.isDeleted = false;
        }

        const pipeline = [
            { $match: matchConditions },
            { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
            { $unwind: '$category' },
            { $lookup: { from: 'subcategories', localField: 'subcategoryId', foreignField: '_id', as: 'subcategory' } },
            { $unwind: '$subcategory' },
            { $lookup: { from: 'brands', localField: 'brandId', foreignField: '_id', as: 'brand' } },
            { $unwind: '$brand' },
            { $sort: { createdAt: -1 } },
        ];

        const products = await Product.aggregate(pipeline);

 
        const allVariants = products.reduce((acc, product) => {
            product.variants.forEach(variant => {
                acc.push({
                    ...variant,
                    varientIsDeleted: variant.isDeleted,
                    productTitle: product.title,
                    brandName: product.brand.brandName,
                    categoryName: product.category.name,
                    subcategoryName: product.subcategory.name,
                    productId: product._id,
                    isDeleted: product.isDeleted,
                });
            });
            return acc;
        }, []);

        const paginatedVariants = allVariants.slice((page - 1) * perPage, page * perPage);

        const totalPages = Math.ceil(allVariants.length / perPage);

        console.log(paginatedVariants)
        return res.render('admin/products', {
            variants: paginatedVariants,
            currentPage: page,
            totalPages,
            perPage,
            search,
            status,
            queryParams: req.query,
            msg: req.query.msg ? { text: req.query.msg, type: req.query.type } : null
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).send('Internal Server Error');
    }
};


export const topProducts = async (req, res) => {
    try {
        const topProducts = await Product.aggregate([
            { $unwind: "$variants" },
            { $group: { _id: "$_id", name: { $first: "$title" }, totalSold: { $sum: "$variants.soldCount" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);
        res.json(topProducts);
    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).send('Internal Server Error');
    }
};


// Rendre Add Products Page
export const renderAddProductsPage = async (req, res) => {
    try {
        const brands = await Brand.find({ isListed: true });
        const categories = await Category.find({ isListed: true }).populate({
            path: 'subcategories',
            match: { isListed: true }, 
        });

        const msg = req.query.msg ? { text: req.query.msg, type: req.query.type } : null;

        return res.render("admin/add-products", {
            brands,
            categories,
            msg,
        });
    } catch (error) {
        console.error("Error fetching categories, brands, and subcategories:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Add New Product
export const addProduct = async (req, res) => {
    try {
        const {
            productName,
            brand,
            description,
            category,
            subCategory,
            variants,
            shareImages
        } = req.body;

        if (!productName || !brand || !description || !category || !subCategory || !variants) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }



        const parsedVariants = JSON.parse(variants);
        
        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one variant is required' });
        }


        const sharedImages = req.files.sharedImages ? req.files.sharedImages.map(file => file.path) : [];

        const processedVariants = parsedVariants.map((variant, index) => {
            const variantImages = shareImages === 'true' 
                ? sharedImages 
                : (req.files[`variantImages_${index}`] 
                    ? req.files[`variantImages_${index}`].map(file => file.path) 
                    : []);

            if (variantImages.length === 0) {
                throw new Error(`Images are required for variant ${index + 1}`);
            }

            if (parseFloat(variant.salePrice) >= parseFloat(variant.regularPrice)) {
                throw new Error(`Sale price must be less than regular price for variant ${index + 1}.`);
            }

            return {
                color: variant.color,
                shade: variant.shade,
                stockQuantity: parseInt(variant.stockQuantity),
                regularPrice: parseFloat(variant.regularPrice),
                salePrice: parseFloat(variant.salePrice),
                images: variantImages
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
            product: newProduct
        });
    } catch (error) {
        console.error('Error in adding product:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal Server Error'
        });
    }
};

// Render Edit Product Page
export const renderEditProductPage = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
                   
        const msg = req.query.msg ? { text: req.query.msg, type: req.query.type } : null;
        const product = await Product.findById(productId)
            .populate('brandId')  
            .populate('categoryId') 
            .populate('subcategoryId') 
            .exec();
        
        const brands = await Brand.find();
        const categories = await Category.find().populate('subcategories'); 
        const variant = product.variants.find(variant => variant._id.toString() === variantId);

        res.render('admin/edit-product', {
            product,
            variant,
            brands,
            categories,
            msg
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching product details");
    }
};




// Update Product
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
        } = req.body;

console.log(req.body)

const variantImages = req.files.map(file => file.originalname);
    console.log('Uploaded images:', variantImages);
        // if (
        //     !productName || !brand || !description || !category || !subCategory ||
        //     !variantColor || !variantShade || !variantRegularPrice || !variantSalePrice || !variantStockQuantity || !variantImages
        // ) {
        //     return res.status(400).json({ success: false, message: 'Missing required fields' });
        // }


        // const product = await Product.findById(req.params.productId);

        // if (!product) {
        //     return res.status(404).json({ success: false, message: 'Product not found' });
        // }


       

        // product.title = productName;
        // product.description = description;
        // product.brandId = mongoose.Types.ObjectId(brand);
        // product.categoryId = mongoose.Types.ObjectId(category);
        // product.subcategoryId = mongoose.Types.ObjectId(subCategory);

        // const variantIndex = product.variants.findIndex(variant => variant._id.toString() === req.params.variantId);
        
        // if (variantIndex !== -1) {
        //     product.variants[variantIndex].color = variantColor;
        //     product.variants[variantIndex].shade = variantShade;
        //     product.variants[variantIndex].regularPrice = variantRegularPrice;
        //     product.variants[variantIndex].salePrice = variantSalePrice;
        //     product.variants[variantIndex].stockQuantity = variantStockQuantity;

        //     if (req.files) {
        //         const variantImageUrls = req.files.map(file => file.path); 
        //         product.variants[variantIndex].images = variantImageUrls;
        //     }

        //     await product.save();

            return res.status(200).json({ success: true, message: 'Product and variant updated successfully' });
        // } else {
        //     return res.status(404).json({ success: false, message: 'Variant not found' });
        // }
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
    }
}

// Toggle Product Status
export const toggleProduct = async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      product.isDeleted = !product.isDeleted;
      product.deletedAt = product.isDeleted ? Date.now() : null;
  
      await product.save();
  
      res.status(200).json({
        success: true,
        isDeleted: product.isDeleted,
        message: product.isDeleted ? 'Product deleted' : 'Product restored',
      });
    } catch (error) {
      console.error('Error toggling product status:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };

  export const toggleProductVariant = async (req, res) => {
    try {
      const { productId, variantId, action } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        return res.status(404).json({ success: false, message: 'Variant not found' });
      }
  
      if (action === 'delete') {
        variant.isDeleted = true;
        variant.deletedAt = Date.now();
      } else if (action === 'restore') {
        variant.isDeleted = false;
        variant.deletedAt = null;
      }
  
      await product.save();
  
      res.status(200).json({
        success: true,
        isDeleted: variant.isDeleted,
        message: variant.isDeleted ? 'Variant deleted' : 'Variant restored',
      });
    } catch (error) {
      console.error('Error toggling product variant status:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };
  

























//   <!DOCTYPE html>
// <html lang="en">

// <%- include('partials/head') %>

// <!-- Main Content Section -->
// <div class="main-content">
//   <!-- Header Section -->
//   <div class="header">
//     <div class="search-bar m-0">
//       <form action="/admin/search" method="GET">
//         <input type="text" name="search" placeholder="Search" readonly>
//         <button class="admin-search-button"><i class="fas fa-search"></i></button>
//       </form>
//     </div>
//     <div class="admin-profile mx-3">
//       <a href="/admin/settings">
//         <i class="fa-solid fa-circle-user"></i>
//       </a>
//     </div>
//   </div>

//   <!-- Breadcrumbs Section -->
//   <div class="breadcrumbs">
//     <a href="/admin/products">Products</a> > <a href="/admin/edit-product/<%= product._id %>"> Edit Product</a>
//   </div>

//  <!-- Edit Products Container -->
//  <form id="edit-product" data-product-id="<%= product._id %>" dats-variant-id="<%= " enctype="multipart/form-data">
//   <div class="edit-products-container row">
//     <div class="add-products-container1 col-6">
//       <!-- Form To Edit Product -->
//       <h4>Edit Product</h4>

//       <!-- Product Name -->
//       <div>
//         <label for="productName">Product Name</label>
//         <input type="text" name="productName" id="productName" value="<%= product.title %>" placeholder="Type product name">
//       </div>

//       <!-- Select Brand -->
//       <div class="add-products-container-center">
//         <div>
//           <label for="brand">Select Brand</label>
//           <select name="brand" id="brand">
//             <option value="">Select Brand</option>
//             <% brands.forEach(brand => { %>
//             <option value="<%= brand._id %>" <%= product.brandId && product.brandId._id.toString() === brand._id.toString() ? 'selected' : '' %>><%= brand.brandName %></option>
//             <% }) %>
//           </select>
//         </div>
//       </div>

//       <!-- Description -->
//       <label for="description">Description</label><br>
//       <textarea id="description" name="description" placeholder="Enter product description here..."><%= product.description %></textarea>

//       <!-- Category And Subcategory -->
//       <div class="add-products-container-center">
//         <div>
//           <label for="category">Category</label><br>
//           <select name="category" id="category" onchange="updateSubCategories()">
//             <option value="">Select Category</option>
//             <% categories.forEach(category => { %>
//             <option value="<%= category._id %>" <%= product.categoryId && product.categoryId._id.toString() === category._id.toString() ? 'selected' : '' %>><%= category.name %></option>
//             <% }) %>
//           </select>
//         </div>
//         <div>
//           <label for="subCategory">Sub Category</label><br>
//           <select name="subCategory" id="subCategory">
//             <option value="">Select Sub Category</option>
//           </select>
//         </div>
//       </div>
      

//     </div>
//     <div class="add-products-container1">
//       <!-- Variants -->
//       <div id="variants-section">
//         <% product.variants.forEach((variant, index) => { %>
//           <div class="variant" data-variant-index="<%= index %>">
//             <h5>Variant <%= index + 1 %></h5>
//             <div class="add-products-container-center d-flex align-items-end">
//               <div>
//                 <label for="variantColor<%= index %>">Color</label>
//                 <input type="color" name="variants[<%= index %>][color]" id="variantColor<%= index %>" value="<%= variant.color %>">
//               </div>
//               <div>
//                 <label for="variantShade<%= index %>">Shade</label>
//                 <input type="text" name="variants[<%= index %>][shade]" id="variantShade<%= index %>" value="<%= variant.shade %>" placeholder="Shade">
//               </div>
//               <div>
//                 <% if (variant.isDeleted) { %>
//                   <button type="button" class="restore-btn" data-product-id="<%= product._id %>" data-variant-id="<%= variant._id %>">Restore Variant</button>
//                 <% }  else { %>
//                   <button type="button" class="delete-btn" data-product-id="<%= product._id %>" data-variant-id="<%= variant._id %>" data-is-new="false">Remove Variant</button>
//                 <% } %>
//               </div>
//             </div>
//             <div class="d-flex justify-content-between">
//               <div>
//                 <label for="variantRegularPrice<%= index %>">Regular Price</label>
//                 <input type="number" name="variants[<%= index %>][regularPrice]" id="variantRegularPrice<%= index %>" value="<%= variant.regularPrice %>" min="0" step="0.01" oninput="validatePrices(this)">
//                 <span class="error-message" id="regularPriceError<%= index %>" style="color: red; display: none;">Regular price must be non-negative.</span>
//               </div>
//               <div>
//                 <label for="variantSalePrice<%= index %>">Sale Price</label>
//                 <input type="number" name="variants[<%= index %>][salePrice]" id="variantSalePrice<%= index %>" value="<%= variant.salePrice %>" min="0" step="0.01" oninput="validatePrices(this)">
//                 <span class="error-message" id="salePriceErrorNegative<%= index %>" style="color: red; display: none;">Sale price must be non-negative.</span>
//                 <span class="error-message" id="salePriceErrorHigh<%= index %>" style="color: red; display: none;">Sale price must be <= regular price.</span>
//               </div>
//               <div>
//                 <label for="variantStockQuantity<%= index %>">Stock Quantity</label>
//                 <input type="number" name="variants[<%= index %>][stockQuantity]" id="variantStockQuantity<%= index %>" value="<%= variant.stockQuantity %>" min="0" oninput="validateStockQuantity(this)">
//                 <span class="error-message" id="stockQuantityError<%= index %>" style="color: red; display: none;">Stock quantity must be non-negative.</span>
//               </div>
//             </div>
//             <div>
//               <label for="variantImages<%= index %>">Images</label>
//               <input type="file" class="mb-2 variant-image-input" name="variants[<%= index %>][images][]" id="variantImages<%= index %>" multiple>
//               <div class="my-2 image-preview-container d-flex flex-wrap justify-content-start">
//                 <% variant.images.forEach((image, imageIndex) => { %>
//                   <div class="image-preview" data-image-index="<%= imageIndex %>">
//                     <img src="<%= image %>" alt="Variant Image" style="width: 70px; height: 70px; margin-left: 3px;">
//                     <button type="button" class="remove-image-btn" onclick="toggleImageRemoval(this, true)">X</button>
//                   </div>
//                 <% }) %>
//               </div>
//             </div>
//           </div>
//           <button type="submit" class="edit-product-btn2 my-3" style="width: 100%;">Update Product</button>
//           <% }) %>
//       </div>
//       <button type="button" id="add-variant-btn" class="my-3" style="width: 100%;">Add Variant</button>
//     </div>
//   </div>
// </form>
// </div>
// <!-- Cropper Modal -->
// <div id="cropperModal" style="display:none;">
//   <div class="modal-content">
//     <div>
//       <button id="cropButton">Crop</button>
//       <button onclick="closeCropperModal()">Close</button>
//     </div>
//     <img id="imageToCrop" src="" alt="Image to crop">
//   </div>
// </div>

// <!-- JavaScript Section -->
// <%- include('partials/footer') %>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/izitoast/dist/js/iziToast.min.js"></script>
// <script>
//     const toastSuccess = (message) => {
//     iziToast.success({
//       message: message,
//       backgroundColor: '#0e932d',
//       messageColor: '#FFFFFF',
//       icon: 'fa fa-check',
//       iconColor: '#FFFFFF',
//       timeout: 1500,
//       position: 'topRight',
//     });
//   };

//   const toastError = (message) => {
//     iziToast.error({
//       message: message,
//       backgroundColor: '#e51e1e',
//       messageColor: '#FFFFFF',
//       icon: 'fa fa-times',
//       iconColor: '#FFFFFF',
//       timeout: 1500,
//       position: 'topRight',
//     });
//   };

//   const toastInfo = (message) => {
//     iziToast.info({
//       message: message,
//       backgroundColor: '#2160de',
//       messageColor: '#FFFFFF',
//       icon: 'fa fa-info-circle',
//       iconColor: '#FFFFFF',
//       timeout: 1500,
//       position: 'topRight',
//     });
//   };

//   const toastWarning = (message) => {
//     iziToast.warning({
//       message: message,
//       backgroundColor: '#e5811e',
//       messageColor: '#212529',
//       icon: 'fa fa-exclamation-triangle',
//       iconColor: '#212529',
//       timeout: 1500,
//       position: 'topRight',
//     });
//   };
//   let cropper;
//   let currentInput;

//   function updateSubCategories() {
//     const categoryId = document.getElementById('category').value;
//     const subCategorySelect = document.getElementById('subCategory');
//     subCategorySelect.innerHTML = '<option value="">Select Sub Category</option>'; 

//     const categories = <%- JSON.stringify(categories) %>;
//     const productSubCategoryId = '<%= product.subcategoryId ? product.subcategoryId._id.toString() : '' %>';

//     categories.forEach(category => {
//       if (category._id.toString() === categoryId) {
//         category.subcategories.forEach(subcategory => {
//           const option = document.createElement('option');
//           option.value = subcategory._id;
//           option.text = subcategory.name;
//           if (subcategory._id.toString() === productSubCategoryId) {
//             option.selected = true; 
//           }
//           subCategorySelect.appendChild(option);
//         });
//       }
//     });
//   }

//   // Function to handle image previews
//   function handleImagePreviews(input, croppedImageSrc = null) {
//     const previewContainer = input.closest('.variant').querySelector('.image-preview-container');
//     if (croppedImageSrc) {
//       const img = document.createElement('img');
//       img.src = croppedImageSrc;
//       img.alt = 'Variant Image';
//       img.style.width = '70px';
//       img.style.height = '70px';
//       img.style.marginRight = '10px';

//       const imageWrapper = document.createElement('div');
//       imageWrapper.classList.add('image-preview');
//       imageWrapper.appendChild(img);

//       const removeButton = document.createElement('button');
//       removeButton.type = 'button';
//       removeButton.classList.add('remove-image-btn');
//       removeButton.textContent = 'X';
//       removeButton.onclick = function() {
//         toggleImageRemoval(this);
//       };
//       imageWrapper.appendChild(removeButton);

//       previewContainer.appendChild(imageWrapper);
//     } else {
//       const files = Array.from(input.files);
//       files.forEach(file => {
//         const reader = new FileReader();
//         reader.onload = function (e) {
//           const img = document.createElement('img');
//           img.src = e.target.result;
//           img.alt = 'Variant Image';
//           img.style.width = '70px';
//           img.style.height = '70px';
//           img.style.marginRight = '10px';
//           img.style.marginBottom = '10px';

//           const imageWrapper = document.createElement('div');
//           imageWrapper.classList.add('image-preview');
//           imageWrapper.appendChild(img);

//           const removeButton = document.createElement('button');
//           removeButton.type = 'button';
//           removeButton.classList.add('remove-image-btn');
//           removeButton.textContent = 'X';
//           removeButton.onclick = function() {
//             toggleImageRemoval(this);
//           };
//           imageWrapper.appendChild(removeButton);

//           previewContainer.appendChild(imageWrapper);
//         };
//         reader.readAsDataURL(file);
//       });
//     }
//   }

//   // Function to open the cropper modal
//   function openCropperModal(imageSrc) {
//     const cropperModal = document.getElementById('cropperModal');
//     const imageToCrop = document.getElementById('imageToCrop');
//     imageToCrop.src = imageSrc;
//     cropperModal.style.display = 'block';
//     cropper = new Cropper(imageToCrop, {
//       aspectRatio: 1,
//       viewMode: 1
//     });
//   }

//   // Function to close the cropper modal
//   function closeCropperModal() {
//     const cropperModal = document.getElementById('cropperModal');
//     cropperModal.style.display = 'none';
//     if (cropper) {
//       cropper.destroy();
//       cropper = null;
//     }
//   }

//   // Function to crop the image
//   function cropImage() {
//     const croppedCanvas = cropper.getCroppedCanvas();
//     const croppedImageDataURL = croppedCanvas.toDataURL('image/jpeg');
//     closeCropperModal();
//     handleImagePreviews(currentInput, croppedImageDataURL);
//   }

//   // Function to toggle image removal
//   function toggleImageRemoval(button, isExisting = false) {
//     const imageWrapper = button.closest('.image-preview');
//     if (isExisting) {
//       if (imageWrapper.classList.contains('removed')) {
//         imageWrapper.classList.remove('removed');
//         button.textContent = 'X';
//       } else {
//         imageWrapper.classList.add('removed');
//         button.textContent = 'Restore';
//       }
//     } else {
//       imageWrapper.remove();
//     }
//   }

//   // Validate prices
//   function validatePrices(input) {
//     const variant = input.closest('.variant');
//     const regularPriceInput = variant.querySelector('input[name*="[regularPrice]"]');
//     const salePriceInput = variant.querySelector('input[name*="[salePrice]"]');
//     const regularPriceError = variant.querySelector(`#regularPriceError${variant.dataset.variantIndex}`);
//     const salePriceErrorNegative = variant.querySelector(`#salePriceErrorNegative${variant.dataset.variantIndex}`);
//     const salePriceErrorHigh = variant.querySelector(`#salePriceErrorHigh${variant.dataset.variantIndex}`);
    
//     const regularPrice = parseFloat(regularPriceInput.value);
//     const salePrice = parseFloat(salePriceInput.value);

//     regularPriceError.style.display = 'none';
//     salePriceErrorNegative.style.display = 'none';
//     salePriceErrorHigh.style.display = 'none';

//     let valid = true;

//     if (salePrice > regularPrice) {
//       salePriceErrorHigh.style.display = 'block';
//       valid = false;
//     } else if (salePrice < 0) {
//       salePriceErrorNegative.style.display = 'block';
//       valid = false;
//     }

//     if (regularPrice < 0) {
//       regularPriceError.style.display = 'block';
//       valid = false;
//     }

//     return valid;
//   }

//   // Validate stock quantity
//   function validateStockQuantity(input) {
//     const variant = input.closest('.variant');
//     const stockQuantityError = variant.querySelector(`#stockQuantityError${variant.dataset.variantIndex}`);
    
//     stockQuantityError.style.display = 'none';

//     if (parseInt(input.value) < 0) {
//       stockQuantityError.style.display = 'block';
//       return false;
//     }

//     return true;
//   }

//   // Initialize subcategories
//   updateSubCategories();

//   document.addEventListener('DOMContentLoaded', function () {
//     const addVariantBtn = document.getElementById('add-variant-btn');
//     const variantsSection = document.getElementById('variants-section');

//     addVariantBtn.addEventListener('click', function () {
//       const variantCount = variantsSection.querySelectorAll('.variant').length;
//       const newVariantIndex = variantCount;

//       const newVariantHtml = `
//         <div class="variant" data-variant-index="${newVariantIndex}">
//           <h5>Variant ${newVariantIndex + 1}</h5>
//           <div class="add-products-container-center d-flex align-items-end">
//             <div>
//               <label for="variantColor${newVariantIndex}">Color</label>
//               <input type="color" name="variants[${newVariantIndex}][color]" id="variantColor${newVariantIndex}">
//             </div>
//             <div>
//               <label for="variantShade${newVariantIndex}">Shade</label>
//               <input type="text" name="variants[${newVariantIndex}][shade]" id="variantShade${newVariantIndex}" placeholder="Shade">
//             </div>
//             <div>
//               <button type="button" class="delete-btn" data-is-new="true">Remove Variant</button>
//             </div>
//           </div>
//           <div class="d-flex justify-content-between">
//             <div>
//               <label for="variantRegularPrice${newVariantIndex}">Regular Price</label>
//               <input type="number" name="variants[${newVariantIndex}][regularPrice]" id="variantRegularPrice${newVariantIndex}" min="0" step="0.01" oninput="validatePrices(this)">
//               <span class="error-message" id="regularPriceError${newVariantIndex}" style="color: red; display: none;">Regular price must be non-negative.</span>
//             </div>
//             <div>
//               <label for="variantSalePrice${newVariantIndex}">Sale Price</label>
//               <input type="number" name="variants[${newVariantIndex}][salePrice]" id="variantSalePrice${newVariantIndex}" min="0" step="0.01" oninput="validatePrices(this)">
//               <span class="error-message" id="salePriceErrorNegative${newVariantIndex}" style="color: red; display: none;">Sale price must be non-negative.</span>
//               <span class="error-message" id="salePriceErrorHigh${newVariantIndex}" style="color: red; display: none;">Sale price must be <= regular price.</span>
//             </div>
//             <div>
//               <label for="variantStockQuantity${newVariantIndex}">Stock Quantity</label>
//               <input type="number" name="variants[${newVariantIndex}][stockQuantity]" id="variantStockQuantity${newVariantIndex}" min="0" oninput="validateStockQuantity(this)">
//               <span class="error-message" id="stockQuantityError${newVariantIndex}" style="color: red; display: none;">Stock quantity must be non-negative.</span>
//             </div>
//           </div>
//           <div>
//             <label for="variantImages${newVariantIndex}">Images</label>
//             <input type="file" class="mb-2 variant-image-input" name="variants[${newVariantIndex}][images][]" id="variantImages${newVariantIndex}" multiple>
//             <div class="my-2 me-2 image-preview-container d-flex flex-wrap justify-content-start"></div>
//           </div>
//         </div>
//       `;

//       variantsSection.insertAdjacentHTML('beforeend', newVariantHtml);
//     });

//     // Event delegation for remove variant button
//     document.addEventListener('click', function (event) {
//       if (event.target.classList.contains('delete-btn')) {
//         const isNew = event.target.getAttribute('data-is-new') === 'true';
//         if (isNew) {
//           const variantElement = event.target.closest('.variant');
//           variantElement.remove();
//         }
//       }
//     });

//     // Event delegation for image input previews and cropper modal
//     document.addEventListener('change', function (event) {
//       if (event.target.classList.contains('variant-image-input')) {
//         currentInput = event.target;
//         const files = Array.from(event.target.files);
//         files.forEach(file => {
//           const reader = new FileReader();
//           reader.onload = function (e) {
//             openCropperModal(e.target.result);
//           };
//           reader.readAsDataURL(file);
//         });
//       }
//     });

//     // Handle crop button click
//     document.getElementById('cropButton').addEventListener('click', cropImage);
//   });
//   document.addEventListener('DOMContentLoaded', function() {
//   const form = document.getElementById('edit-product');

//   form.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const productId = form.getAttribute('data-product-id');
//     const variantId = from.getAttribute('data-variant-id')

//     console.log(productId)
//     console.log(variantId)
   

//     try {
//       const response = await fetch(`/edit-product/${productId}/${variantId}`, {
//         method: 'PATCH',
//         body: formData,
//       });

//       if (response.ok) {
//         const result = await response.json();

//         if (result.success) {
//           toastSuccess(result.message);
//         } else {
//           toastError(result.message)
//         }
//       } else {
//         toastError('Error while updating product.');
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       toastWarning('An error occurred while updating the product.');
//     }
//   });
// });

//   document.addEventListener('DOMContentLoaded', function () {
//     const buttons = document.querySelectorAll('.delete-btn, .restore-btn');

//     buttons.forEach(button => {
//         button.addEventListener('click', async () => {
//             const productId = button.getAttribute('data-product-id');
//             const variantId = button.getAttribute('data-variant-id');
//             const isDeleted = button.classList.contains('restore-btn');  
//             const action = isDeleted ? 'restore' : 'delete';  

//             try {
//                 const response = await fetch(`/admin/toggle-variant`, {
//                     method: 'PATCH',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({ productId, variantId, action })
//                 });

//                 if (response.ok) {
//                     const result = await response.json();
//                     if (result.success) {
//                         if (action === 'delete') {
//                             button.textContent = 'Restore Variant';
//                             button.classList.remove('delete-btn');
//                             button.classList.add('restore-btn');
//                         } else {
//                             button.textContent = 'Remove Variant';
//                             button.classList.remove('restore-btn');
//                             button.classList.add('delete-btn');
//                         }
//                         toastSuccess(result.message);  
//                     } else {
//                         toastError('Failed to update variant status');
//                     }
//                 } else {
//                     toastError('Error toggling variant status');
//                 }
//             } catch (error) {
//                 console.error('Error:', error);
//                 toastWarning('An error occurred');
//             }
//         });
//     });
// });
// </script>

// <%- include('partials/footer') %>

// </html>