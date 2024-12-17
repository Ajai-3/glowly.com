import express from "express";
const router = express.Router();
import {
  renderLoginPage,
  renderDashboardPage,
  renderProductsPage,
  renderOrderlistsPage,
  // renderUsersPage,
  renderSalesReportPage,
  renderCouponsPage,
  renderCategoryPage,
  renderSettingsPage,
  renderBannerManagementPage,
  renderAddProductsPage,
  renderEditProductsPage,
  handleAdminLogin,
  handleAdminLogout,
} from "../controllers/admin/admin.controller.js";
import { adminAuthMiddleware, pageMiddlware } from "../middlewares/admin.midleware.js";
import { renderUsersPage, blockUser, unBlockUser } from '../controllers/admin/customer.controller.js'


// Admin login and logout routes
router.get("/admin-login", renderLoginPage); 
router.post("/admin-login", handleAdminLogin); 
router.get("/admin-logout", handleAdminLogout);


// Pages Are Protected With adminAuthMiddleware
router.use(adminAuthMiddleware);
router.use(pageMiddlware);

// Admin Login
router.post("/admin-login", handleAdminLogin);
// Dashboard Routes
router.get("/dashboard", renderDashboardPage);
// Product Routes
router.get("/products", renderProductsPage);
router.get("/add-products", renderAddProductsPage);
router.get("/edit-products", renderEditProductsPage);
// Order Routes
router.get("/orderlists", renderOrderlistsPage);
// Users Routes
router.get("/users", renderUsersPage);
router.get('/search-user', renderUsersPage)
router.get('/block-user', blockUser);
router.get('/unblock-user', unBlockUser);
//
router.get("/sales-report", renderSalesReportPage);
//
router.get("/coupons", renderCouponsPage);
//
router.get("/category", renderCategoryPage);
//
router.get("/banner-management", renderBannerManagementPage);
//
router.get("/settings", renderSettingsPage);





export default router;
