import express from "express";
const router = express.Router();
import multer from "multer";
import storage from "../helpers/multer.js"
const uploads = multer ({ storage:storage })
import {
  renderLoginPage,
  renderDashboardPage,
  renderOrderlistsPage,
  renderSalesReportPage,
  renderSettingsPage,
  renderBannerManagementPage,
  handleAdminLogin,
  handleAdminLogout,
} from "../controllers/admin/admin.controller.js";
import { adminAuthMiddleware, pageMiddlware } from "../middlewares/admin.midleware.js";
import { renderUsersPage, blockUser, unBlockUser } from '../controllers/admin/customer.controller.js'
import { renderCategoryPage, renderAddCategoryPage, addSubcategoryToExistingCategory, deleteCategory, updateCategory, renderEditCategoryPage, addCategory } from "../controllers/admin/category.controller.js";
import { renderProductsPage, renderAddProductsPage, addProduct, renderEditProductPage, editProduct } from "../controllers/admin/product.controller.js";
import { renderBrandPage, renderAddBrandPage, addBrand,  renderEditBrandPage, editBrand, deleteBrand } from "../controllers/admin/brand.controller.js";
import { renderCouponsPage,  renderEditCouponPage, addCoupon, editCoupon } from "../controllers/admin/coupon.controller.js";


// Admin login and logout routes
router.get("/admin-login", renderLoginPage);
router.post("/admin-login", handleAdminLogin);
router.get("/admin-logout", handleAdminLogout);


// Pages Are Protected With adminAuthMiddleware
// router.use(adminAuthMiddleware);
router.use(pageMiddlware);

// Admin Login
router.post("/admin-login", handleAdminLogin);
// Dashboard Routes
router.get("/dashboard", renderDashboardPage);
// Product Routes
router.get("/products", renderProductsPage);
router.get("/add-products", renderAddProductsPage);
router.post('/add-products', uploads.array('productImages', 4), addProduct);
router.get("/edit-product/:id", renderEditProductPage);
router.post("/edit-product/:id", uploads.array('productImages', 4), editProduct);

// Brand Router
router.get("/brands", renderBrandPage)
router.get("/add-new-brand", renderAddBrandPage);
router.post("/add-new-brand", uploads.single("image"), addBrand);
router.get("/edit-brand/:brandId", renderEditBrandPage);
router.post('/edit-brand/:brandId', uploads.single('image'), editBrand);
router.get("/delete-brand/:brandId", deleteBrand);

// Category & Subcategory Routes
router.get("/category", renderCategoryPage);
router.get("/add-category", renderAddCategoryPage);
router.post('/add-subcategory', addSubcategoryToExistingCategory);
router.post("/add-category", addCategory);
router.get('/category/edit/:id', renderEditCategoryPage);
router.post('/category/edit/:id', updateCategory);
router.get('/category/delete/:id', deleteCategory);
// Users Routes
router.get("/users", renderUsersPage);
router.get('/search-user', renderUsersPage)
router.get('/block-user', blockUser);
router.get('/unblock-user', unBlockUser);
// Coupon Routes
router.get("/coupons", renderCouponsPage);
// router.get("/add-coupon", renderAddCouponPage);
router.post("/add-coupon", addCoupon);
router.get("/edit-coupon", renderEditCouponPage);
router.post("/edit-coupon", editCoupon);
// Order Routes
router.get("/orderlists", renderOrderlistsPage);
//
router.get("/sales-report", renderSalesReportPage);

//
router.get("/banner-management", renderBannerManagementPage);
//
router.get("/settings", renderSettingsPage);





export default router;
