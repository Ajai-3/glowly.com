import express from "express";
const router = express.Router();
import {
  renderLoginPage,
  renderDashboardPage,
  renderProductsPage,
  renderOrderlistsPage,
  renderUsersPage,
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

router.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

router.get("/users", renderUsersPage);
router.get("/coupons", renderCouponsPage);
router.get("/products", renderProductsPage);
router.get("/admin-login", renderLoginPage);
router.get("/category", renderCategoryPage);
router.get("/settings", renderSettingsPage);
router.get("/dashboard", renderDashboardPage);
router.get("/admin-logout", handleAdminLogout);
router.get("/orderlists", renderOrderlistsPage);
router.get("/add-products", renderAddProductsPage);
router.get("/sales-report", renderSalesReportPage);
router.get("/edit-products", renderEditProductsPage);
router.get("/banner-management", renderBannerManagementPage);

router.post("/admin-login", handleAdminLogin);

export default router;
