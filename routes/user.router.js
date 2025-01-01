import express from "express";
import passport from "../config/passport.js";
const router = express.Router();
import { verifyToken } from "../middlewares/auth.middleware.js";
import { renderHomePage } from "../controllers/user/home.controller.js";
import {
  renderLoginPage,
  renderSignupPage,
  renderOtpStatusPage,
  renderNewPasswordPage,
  renderForgotPasswordPage,
  renderpOtpVerificationPage,
  pageNotFound,
  handleUserLogin,
  handleResendOTP,
  handleUserSignup,
  handleUserLogout,
  handleResetPassword,
  handleForgotPassword,
  handleOTPVerification,
  googleCallbackHandler,

} from "../controllers/user/user.controller.js";
import {
  renderProductPage,
  renderPageWithCategory,
  renderPageWithSubcategory,
} from "../controllers/user/product-page.controller.js";
import { renderCartPage, addToCart } from "../controllers/user/cart.controller.js";
import { renderWishlistPage, addToWishlist } from "../controllers/user/wishlist.controller.js";
import { renderMyAccountPage } from "../controllers/user/user.account.controller.js";
// Apply Middleware To All Routes
// router.use(authMiddleware);


router.get("/", renderHomePage); // Home Page
router.get("/home", renderHomePage); // Home Page User After Login
router.get("/login", verifyToken, renderLoginPage); // Login Page
router.get("/signup",  verifyToken, renderSignupPage); // Signup Page
router.get("/page-not-found", verifyToken, pageNotFound);
router.get("/reset-password/:token", renderNewPasswordPage); // New Password Page
router.get("/otp-message", verifyToken, renderOtpStatusPage); // OTP Message Page
router.get("/forgot-password", verifyToken, renderForgotPasswordPage); // Forgot Password Page
router.get("/otp-verification", verifyToken,  renderpOtpVerificationPage); // OTP Verification Page
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  googleCallbackHandler
);

router.post("/login", verifyToken, handleUserLogin);
router.post("/signup",verifyToken,  handleUserSignup);
router.post("/resend-otp", handleResendOTP);
router.post("/forgot-password", verifyToken, handleForgotPassword);
router.post("/otp-verification", verifyToken, handleOTPVerification);
router.post("/new-password", verifyToken, handleResetPassword)

// Product, Category & Sub Category Management 
router.get("/product/:id", renderProductPage);
router.get("/category/:categoryName", renderPageWithCategory);
router.get("/subcategory/:subcategoryName", renderPageWithSubcategory);

// Account Mangement
router.get("/my-account", renderMyAccountPage)

// Cart Management
router.get("/my-cart", renderCartPage)
router.post("/add-to-cart/:id", addToCart);

//Wish list Management
router.get("/my-wishlist", renderWishlistPage)
router.post("/add-to-wishlist/:productId", addToWishlist)

router.get("/logout", handleUserLogout);

export default router;
