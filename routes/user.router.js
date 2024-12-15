import express from "express";
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
} from "../controllers/user/user.controller.js";

router.get("/", renderHomePage); // Home Page
router.get("/home", renderHomePage); // Home Page User After Login
router.get("/login", renderLoginPage); // Login Form
router.get("/signup", renderSignupPage); // Signup Form
router.get("/otp-message", renderOtpStatusPage); // OTP Message Page
router.get("/new-password", renderNewPasswordPage); // New Password Page
router.get("/forgot-password", renderForgotPasswordPage); // Forgot Password Page
router.get("/otp-verification", renderpOtpVerificationPage); // OTP Verification Page

router.post("/login", handleUserLogin);
router.post("/signup", handleUserSignup);
router.post("/resend-otp", handleResendOTP);
router.post("/otp-verification", handleOTPVerification);


export default router;
