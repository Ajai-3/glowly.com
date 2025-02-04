import express from "express";
import passport from "../config/passport.js";
const router = express.Router();
import multer from "multer";
import storage from "../helpers/multer.js"
const upload = multer({ storage: storage });
import { verifyToken } from "../middlewares/auth.middleware.js";
import { loadUserData } from "../middlewares/loadUserData.midleware.js";
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
  renderShopPage
  // productPageFilters,
} from "../controllers/user/product-page.controller.js";
import { renderCartPage, addToCart, buyNow, removeCartProduct, updateCartPageProduct } from "../controllers/user/cart.controller.js"
import { renderWishlistPage, addToWishlist } from "../controllers/user/wishlist.controller.js";
import { handleAddAddress, handleProfileUpdate, renderManageAddressPage, removeAddress, renderMyAccountPage, updateAddress, editAddressPage } from "../controllers/user/user.account.controller.js";
import { placeOrder, placeOrderWithBuyNow, renderCheckoutPage, verifyCoupon, verifyRazorpayPayment, paymentRetry  } from "../controllers/user/checkout.controller.js";
import { cancelOrder, orderDetailsPage, renderOrderListPage, returnOrder } from "../controllers/user/order.controller.js";
import { get } from "mongoose";
import { addMoneyToWallet, myWallet } from "../controllers/user/wallet.controller.js";
import { myCoupons } from "../controllers/user/coupon.contoller.js";
import { helpPage } from "../controllers/user/others.controller.js";
// Apply Middleware To All Routes
// router.use(authMiddleware);


router.get("/", loadUserData, renderHomePage); // Home Page
router.get("/home", loadUserData, renderHomePage); // Home Page User After Login
router.get("/login", verifyToken, renderLoginPage); // Login Page
router.get("/signup",  verifyToken, renderSignupPage); // Signup Page
router.get("/page-not-found", verifyToken, pageNotFound);

router.get("/reset-password/:code", renderNewPasswordPage); // New Password Page

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

router.post("/reset-password", handleResetPassword)

// Product, Category & Sub Category Management 
router.get("/product/:productId/:variantId", loadUserData, renderProductPage);
router.get("/shop", loadUserData, renderShopPage);
// router.get("/subcategory/:subcategoryId", renderPageWithSubcategory);
// router.post("/product-Page-filters", productPageFilters)

// Account Mangement
router.get("/my-account", loadUserData, renderMyAccountPage)
router.post("/my-account",  upload.single('profile-pic'), loadUserData, handleProfileUpdate)
// router.post("/remove-profile-pic", removeProfilePicture);


// Address Management
router.get("/manage-address", loadUserData, renderManageAddressPage);
router.post("/add-address", loadUserData, handleAddAddress);
router.post("/remove-address/:addressId", loadUserData, removeAddress);
// router.get('/get-address/:addressId', loadUserData, getAddress);

router.get('/edit-address/:id', loadUserData, editAddressPage)
router.post('/edit-address/:addressId', loadUserData, updateAddress);

// Cart Management
router.get("/my-cart", loadUserData, renderCartPage)
router.post("/add-to-cart", loadUserData, addToCart);
router.post("/buy-now", loadUserData, buyNow);
router.post("/remove-cart-product", loadUserData, removeCartProduct);
router.patch("/update-cart-product", loadUserData, updateCartPageProduct)

// Checkout Mangement
router.get("/checkout", loadUserData, renderCheckoutPage);
router.post("/place-order", loadUserData, placeOrder);
router.post("/verify-coupon", loadUserData, verifyCoupon);
router.get('/placeOrderWithBuyNow', loadUserData, placeOrderWithBuyNow);
router.post('/verify-razorpay-payment', loadUserData, verifyRazorpayPayment);

// Order Management
router.get("/my-orders", loadUserData, renderOrderListPage);
router.patch("/cancel-order", loadUserData, cancelOrder)
router.patch("/return-order", loadUserData, returnOrder)
router.post("/payment-failed-retry", loadUserData, paymentRetry);
// router.post("/verify-razorpay-place-order", verifyRazorPayOrderPayment)
router.get('/product-details/:orderId/:productId/:variantId/:addressId', loadUserData, orderDetailsPage)
//Wish list Management
router.get("/my-wishlist", loadUserData, renderWishlistPage)
router.post('/add-to-wishlist/:id', loadUserData, addToWishlist);

// Wallet Managent
router.get("/my-wallet", loadUserData, myWallet)
router.post("/add-money-to-wallet", loadUserData, addMoneyToWallet)

// Coupon Management
router.get("/my-coupons", loadUserData, myCoupons)

// Other Page Mnagement
router.get("/help", loadUserData, helpPage);

router.get("/logout", loadUserData, handleUserLogout);


export default router;
