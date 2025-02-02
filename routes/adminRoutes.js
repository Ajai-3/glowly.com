import express from "express";
const router = express.Router();
import multer from "multer";
import storage from "../helpers/multer.js"
const uploads = multer ({ storage:storage })
import { uploadImages } from "../helpers/cloudinary.js"
import {
  renderLoginPage,
  renderSalesReportPage,
  renderSettingsPage,
  renderBannerManagementPage,
  handleAdminLogin,
  handleAdminLogout,
} from "../controllers/admin/admin.controller.js";
import { redirectIfLoggedIn, verifyAdminToken, pageMiddlware } from "../middlewares/admin.midleware.js";
import { renderUsersPage, blockUser, unBlockUser } from '../controllers/admin/customer.controller.js'
import { renderCategoryPage, renderAddCategoryPage, addSubcategoryToExistingCategory, deleteCategory, updateCategory, renderEditCategoryPage, toggleCategory, addCategory, toggleSubcategory, renderAddOfferPage, addOffer, removeOffer } from "../controllers/admin/category.controller.js";
import { renderProductsPage, renderAddProductsPage,  addProduct, renderEditProductPage, editProduct, toggleProduct } from "../controllers/admin/product.controller.js";
import { renderBrandPage, renderAddBrandPage, addBrand,  renderEditBrandPage, editBrand, toggleBrand, deleteBrand } from "../controllers/admin/brand.controller.js";
import { renderCouponsPage,  renderEditCouponPage, addCoupon, editCoupon, removeCoupon, restoreCoupon } from "../controllers/admin/coupon.controller.js";
import { renderOrderPage, updateOrderStatus } from "../controllers/admin/order.controller.js";
import { renderDashboardPage } from "../controllers/admin/dashboard.controller.js";


// Pages Are Protected With adminAuthMiddleware


// Admin login and logout routes
router.get("/admin-login", redirectIfLoggedIn, renderLoginPage);
router.post("/admin-login", redirectIfLoggedIn, handleAdminLogin);
router.get("/admin-logout", handleAdminLogout);

// router.use(verifyAdminToken);
router.use(pageMiddlware);

// Dashboard Controller
router.get("/dashboard", verifyAdminToken, renderDashboardPage);

// Product Routes
router.get("/products", verifyAdminToken, renderProductsPage);
router.get('/search-products', verifyAdminToken, renderProductsPage)
router.get("/add-products", verifyAdminToken, renderAddProductsPage);
router.patch("/toggle-product/:id", verifyAdminToken, toggleProduct); // Delete And Restore
// router.post('/add-products', verifyAdminToken, uploads.array('productImages', 4), addProduct);

router.post('/add-products', uploadImages, addProduct);
router.get("/edit-product/:id", verifyAdminToken, renderEditProductPage);
router.post("/edit-product/:id", verifyAdminToken, uploads.array('productImages', 4), editProduct);

// Brand Router
router.get("/brands", verifyAdminToken, renderBrandPage)
router.get("/search-brands", verifyAdminToken, renderBrandPage)
router.patch("/toggle-brand/:id", verifyAdminToken, toggleBrand)
router.get("/add-new-brand", verifyAdminToken, renderAddBrandPage);
router.post("/add-new-brand", verifyAdminToken, uploads.single("image"), addBrand);
router.get("/edit-brand/:brandId", verifyAdminToken, renderEditBrandPage);
router.patch('/edit-brand/:brandId', verifyAdminToken, uploads.single('image'), editBrand);
router.get("/delete-brand/:brandId", verifyAdminToken, deleteBrand);

// Category & Subcategory Routes
router.get("/category", verifyAdminToken, renderCategoryPage);
router.patch("/toggle-category/:id", verifyAdminToken, toggleCategory);
router.patch("/toggle-subcategory/:id", verifyAdminToken, toggleSubcategory)
router.get("/add-category", verifyAdminToken, renderAddCategoryPage);
router.post('/add-subcategory', verifyAdminToken, addSubcategoryToExistingCategory);
router.post("/add-category", verifyAdminToken, addCategory);
router.get('/category/edit/:id', verifyAdminToken, renderEditCategoryPage);
router.patch('/category/edit/:id', verifyAdminToken, updateCategory);
router.get('/category/delete/:id', verifyAdminToken, deleteCategory);
router.get("/add-offer/:id", verifyAdminToken, renderAddOfferPage);
// router.post("/add-offer/:categoryId", verifyAdminToken, addOffer);
router.post("/add-offer", verifyAdminToken, addOffer);
router.post("/remove-offer/:categoryId", verifyAdminToken, removeOffer);
// Users Routes
router.get("/users", verifyAdminToken, renderUsersPage);
router.get('/search-user', verifyAdminToken, renderUsersPage)
router.put('/block-user', verifyAdminToken, blockUser);
router.put('/unblock-user', verifyAdminToken, unBlockUser);
// Coupon Routes
router.get("/coupons", verifyAdminToken, renderCouponsPage);
router.patch('/remove-coupon', verifyAdminToken, removeCoupon);
router.patch('/restore-coupon', verifyAdminToken, restoreCoupon);
// router.get("/add-coupon", renderAddCouponPage);
router.post("/add-coupon", verifyAdminToken, addCoupon);
router.get("/edit-coupon", verifyAdminToken, renderEditCouponPage);
router.post("/edit-coupon", verifyAdminToken, editCoupon);
// Order Routes
router.get("/orderlists", verifyAdminToken, renderOrderPage);
router.patch("/update-order-status", verifyAdminToken, updateOrderStatus)

//
router.get("/sales-report", verifyAdminToken, renderSalesReportPage);

//
router.get("/banner-management", verifyAdminToken, renderBannerManagementPage);
//
router.get("/settings", verifyAdminToken, renderSettingsPage);





export default router;
