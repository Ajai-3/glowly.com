import express from "express";
import passport from "../config/passport.js";
const router = express.Router();
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
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { renderHomePage } from "../controllers/user/home.controller.js";
import { renderProductPage, renderPageWithCategory, renderPageWithSubcategory } from "../controllers/user/product-page.controller.js";
// Apply Middleware To All Routes 
// router.use(authMiddleware);


router.get("/", renderHomePage); // Home Page
router.get("/home", renderHomePage); // Home Page User After Login
router.get("/login", authMiddleware, renderLoginPage); // Login Page
router.get("/signup", authMiddleware, renderSignupPage); // Signup Page
router.get("/page-not-found", authMiddleware, pageNotFound);
// router.get("/otp-message", renderOtpStatusPage); // OTP Message Page
router.get("/new-password", authMiddleware, renderNewPasswordPage); // New Password Page
router.get("/forgot-password", authMiddleware, renderForgotPasswordPage); // Forgot Password Page
router.get("/otp-verification", authMiddleware, renderpOtpVerificationPage); // OTP Verification Page

router.get("/logout", handleUserLogout);
router.get("/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get("/auth/google/callback", passport.authenticate('google', { failureRedirect: '/signup' }), googleCallbackHandler)

router.post("/login", handleUserLogin);
router.post("/signup", handleUserSignup);
router.post("/resend-otp", handleResendOTP);
router.post("/otp-verification", handleOTPVerification);




router.get("/product/:id", renderProductPage)
router.get("/category/:categoryName", renderPageWithCategory);
router.get("/subcategory/:subcategoryName", renderPageWithSubcategory);



export default router;
