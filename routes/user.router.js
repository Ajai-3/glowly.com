import express from "express";
import passport from "../config/passport.js";
const router = express.Router();
import {
    renderForgotPasswordPage,
    renderHomePage,
    renderLoginPage,
    renderNewPasswordPage,
    renderpOtpVerificationPage,
    renderOtpStatusPage,
    renderSignupPage,
    handleUserSignup,
    handleUserLogin,
    handleOTPVerification,
    handleResendOTP,
    pageNotFound,
    handleUserLogout,
} from "../controllers/user/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

// Apply Middleware To All Routes 
// router.use(authMiddleware);


router.get("/", renderHomePage); // Home Page
router.get("/home", renderHomePage); // Home Page User After Login
router.get("/login", authMiddleware, renderLoginPage); // Login Page
router.get("/signup", authMiddleware, renderSignupPage); // Signup Page
router.get("/page-not-found", pageNotFound);
// router.get("/otp-message", renderOtpStatusPage); // OTP Message Page
router.get("/new-password",authMiddleware, renderNewPasswordPage); // New Password Page
router.get("/forgot-password", authMiddleware, renderForgotPasswordPage); // Forgot Password Page
router.get("/otp-verification", authMiddleware, renderpOtpVerificationPage); // OTP Verification Page

router.get("/logout", handleUserLogout);
router.get("/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get("/auth/google/callback", passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    res.redirect('/home')
})

router.post("/login", handleUserLogin);
router.post("/signup", handleUserSignup);
router.post("/resend-otp", handleResendOTP);
router.post("/otp-verification", handleOTPVerification);




export default router;
