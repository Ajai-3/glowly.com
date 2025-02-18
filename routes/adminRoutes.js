import express from "express";
const router = express.Router();
import multer from "multer";
import storage from "../helpers/multer.js";
const uploads = multer({ storage: storage });
const upload = multer({ storage: storage });
import { uploadImages } from "../helpers/cloudinary.js";
import {
  renderLoginPage,
  handleAdminLogin,
  handleAdminLogout,
} from "../controllers/admin/admin.controller.js";
import {
  redirectIfLoggedIn,
  verifyAdminToken,
  pageMiddlware,
} from "../middlewares/admin.midleware.js";
import {
  renderUsersPage,
  blockUser,
  unBlockUser,
} from "../controllers/admin/customer.controller.js";
import {
  renderCategoryPage,
  renderAddCategoryPage,
  addSubcategoryToExistingCategory,
  updateCategory,
  renderEditCategoryPage,
  toggleCategory,
  addCategory,
  toggleSubcategory,
  renderAddOfferPage,
  addOffer,
  removeOffer,
  topCategories,
  topSubCategories,
} from "../controllers/admin/category.controller.js";
import {
  renderProductsPage,
  renderAddProductsPage,
  addProduct,
  renderEditProductPage,
  editProduct,
  toggleProduct,
  topProducts,
  toggleProductVariant,
  addVariantPage,
  addNewVariants,
  addProductOffer,
  removeProductOffer,
} from "../controllers/admin/product.controller.js";
import {
  renderBrandPage,
  renderAddBrandPage,
  addBrand,
  renderEditBrandPage,
  editBrand,
  toggleBrand,
  topBrands,
} from "../controllers/admin/brand.controller.js";
import {
  renderCouponsPage,
  addCoupon,
  removeCoupon,
  restoreCoupon,
} from "../controllers/admin/coupon.controller.js";
import {
  renderOrderPage,
  updateOrderStatus,
} from "../controllers/admin/order.controller.js";
import {
  renderDashboardPage,
  salesData,
} from "../controllers/admin/dashboard.controller.js";
import { renderTopItemsPage } from "../controllers/admin/topitem.controller.js";
import {
  renderSettingsPage,
  updateAdminProfile,
} from "../controllers/admin/admin-settings.controller.js";

// Admin login and logout routes
router.get("/admin-login", redirectIfLoggedIn, renderLoginPage);
router.post("/admin-login", redirectIfLoggedIn, handleAdminLogin);
router.get("/admin-logout", handleAdminLogout);

// router.use(verifyAdminToken);
router.use(pageMiddlware);

// Dashboard Controller
router.get("/dashboard", verifyAdminToken, renderDashboardPage);
router.get("/all-sales-data", verifyAdminToken, salesData);

// Top items
router.get("/top-items", verifyAdminToken, renderTopItemsPage);

// Product Routes
router.get("/products", verifyAdminToken, renderProductsPage);
router.post("/product-offer", verifyAdminToken, addProductOffer);
router.post("/remove-product-offer/:productId", verifyAdminToken, removeProductOffer);
router.get("/search-products", verifyAdminToken, renderProductsPage);
router.get("/add-products", verifyAdminToken, renderAddProductsPage);
router.patch("/toggle-product/:id", verifyAdminToken, toggleProduct); 
router.patch("/toggle-variant", verifyAdminToken, toggleProductVariant);
router.get("/top-products", verifyAdminToken, topProducts);
router.post("/add-products", uploadImages, addProduct);
router.get(
  "/edit-product/:productId/:variantId",
  verifyAdminToken,
  renderEditProductPage
);
router.patch("/edit-product/:productId/:variantId", uploadImages, editProduct);
router.get("/add-variants/:productId", verifyAdminToken, addVariantPage);
router.patch(
  "/add-new-variants",
  verifyAdminToken,
  uploadImages,
  addNewVariants
);

// Brand Router
router.get("/brands", verifyAdminToken, renderBrandPage);
router.get("/search-brands", verifyAdminToken, renderBrandPage);
router.patch("/toggle-brand/:id", verifyAdminToken, toggleBrand);
router.get("/add-new-brand", verifyAdminToken, renderAddBrandPage);
router.post(
  "/add-new-brand",
  verifyAdminToken,
  uploads.single("image"),
  addBrand
);
router.get("/edit-brand/:brandId", verifyAdminToken, renderEditBrandPage);
router.patch(
  "/edit-brand/:brandId",
  verifyAdminToken,
  uploads.single("image"),
  editBrand
);
router.get("/top-brands", verifyAdminToken, topBrands);

// Category & Subcategory Routes
router.get("/category", verifyAdminToken, renderCategoryPage);
router.patch("/toggle-category/:id", verifyAdminToken, toggleCategory);
router.patch("/toggle-subcategory/:id", verifyAdminToken, toggleSubcategory);
router.get("/add-category", verifyAdminToken, renderAddCategoryPage);
router.post(
  "/add-subcategory",
  verifyAdminToken,
  addSubcategoryToExistingCategory
);
router.post("/add-category", verifyAdminToken, addCategory);
router.get("/category/edit/:id", verifyAdminToken, renderEditCategoryPage);
router.patch("/category/edit/:id", verifyAdminToken, updateCategory);
router.get("/add-offer/:id", verifyAdminToken, renderAddOfferPage);
router.get("/top-categories", verifyAdminToken, topCategories);
router.get("/top-subcategories", verifyAdminToken, topSubCategories);
router.post("/add-offer", verifyAdminToken, addOffer);
router.post("/remove-offer/:categoryId", verifyAdminToken, removeOffer);

// Users Routes
router.get("/users", verifyAdminToken, renderUsersPage);
router.get("/search-user", verifyAdminToken, renderUsersPage);
router.put("/block-user", verifyAdminToken, blockUser);
router.put("/unblock-user", verifyAdminToken, unBlockUser);

// Coupon Routes
router.get("/coupons", verifyAdminToken, renderCouponsPage);
router.post("/add-coupon", verifyAdminToken, addCoupon);
router.patch("/remove-coupon", verifyAdminToken, removeCoupon);
router.patch("/restore-coupon", verifyAdminToken, restoreCoupon);

// Order Routes
router.get("/orderlists", verifyAdminToken, renderOrderPage);
router.patch("/update-order-status", verifyAdminToken, updateOrderStatus);

// Settings Routes
router.get("/settings", verifyAdminToken, renderSettingsPage);
router.patch(
  "/settings/update",
  verifyAdminToken,
  upload.single("profile-pic"),
  updateAdminProfile
);

export default router;
