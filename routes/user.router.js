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
} from "../controllers/user/user.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

router.get("/", renderHomePage); // Home Page
router.get("/home", renderHomePage); // Home Page User After Login
router.get("/page-not-found", pageNotFound);
router.get("/login",  renderLoginPage); // Login Page
router.get("/signup",  renderSignupPage); // Signup Page
router.get("/otp-message", isAuthenticated, renderOtpStatusPage); // OTP Message Page
router.get("/new-password", isAuthenticated,renderNewPasswordPage); // New Password Page
router.get("/forgot-password", isAuthenticated, renderForgotPasswordPage); // Forgot Password Page
router.get("/otp-verification", isAuthenticated, renderpOtpVerificationPage); // OTP Verification Page
router.get("/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get("/auth/google/callback", passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    res.redirect('/home')
})

router.post("/login", handleUserLogin);
router.post("/signup", handleUserSignup);
router.post("/resend-otp", handleResendOTP);
router.post("/otp-verification", handleOTPVerification);




export default router;
