import express from "express";
import passport from "../config/passport.js";
const router = express.Router();
import { verifyToken } from "../middlewares/auth.middleware.js";
import { renderHomePage } from "../controllers/user/home.controller.js";
import {
  renderForgotPasswordPage,
  renderLoginPage,
  renderNewPasswordPage,
  renderpOtpVerificationPage,
  renderSignupPage,
  handleUserSignup,
  handleUserLogin,
  handleOTPVerification,
  handleResendOTP,
  pageNotFound,
  googleCallbackHandler,
  handleUserLogout,
} from "../controllers/user/user.controller.js";
import {
  renderProductPage,
  renderPageWithCategory,
  renderPageWithSubcategory,
} from "../controllers/user/product-page.controller.js";
// Apply Middleware To All Routes
// router.use(authMiddleware);

router.get("/", renderHomePage); // Home Page
router.get("/home", renderHomePage); // Home Page User After Login
router.get("/login", verifyToken, renderLoginPage); // Login Page
router.get("/signup",  verifyToken, renderSignupPage); // Signup Page
router.get("/page-not-found", verifyToken, pageNotFound);
// router.get("/otp-message", verifyToken, renderOtpStatusPage); // OTP Message Page
router.get("/new-password", verifyToken, renderNewPasswordPage); // New Password Page
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
router.post("/resend-otp", verifyToken, handleResendOTP);
router.post("/otp-verification", verifyToken, handleOTPVerification);

router.get("/product/:id", renderProductPage);
router.get("/category/:categoryName", renderPageWithCategory);
router.get("/subcategory/:subcategoryName", renderPageWithSubcategory);


router.get("/logout", handleUserLogout);

export default router;
