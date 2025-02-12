import express from "express";
import multer from "multer";
import passport from "../config/passport.js";
const router = express.Router();
import storage from "../helpers/multer.js";
const upload = multer({ storage: storage });
import { verifyToken } from "../middlewares/auth.middleware.js";
import { loadUserData } from "../middlewares/loadUserData.midleware.js";
import { renderHomePage } from "../controllers/user/home.controller.js";
import {
  pageNotFound,
  handleUserLogin,
  handleResendOTP,
  renderLoginPage,
  renderSignupPage,
  handleUserSignup,
  handleUserLogout,
  handleResetPassword,
  renderOtpStatusPage,
  handleForgotPassword,
  handleOTPVerification,
  googleCallbackHandler,
  renderNewPasswordPage,
  renderForgotPasswordPage,
  renderpOtpVerificationPage,
} from "../controllers/user/user.controller.js";
import {
  renderShopPage,
  renderProductPage,
} from "../controllers/user/product-page.controller.js";
import {
  buyNow,
  addToCart,
  renderCartPage,
  removeCartProduct,
  updateCartPageProduct,
} from "../controllers/user/cart.controller.js";
import {
  addToWishlist,
  renderWishlistPage,
} from "../controllers/user/wishlist.controller.js";
import {
  removeAddress,
  updateAddress,
  editAddressPage,
  handleAddAddress,
  renderMyAccountPage,
  handleProfileUpdate,
  renderManageAddressPage,
} from "../controllers/user/user.account.controller.js";
import {
  placeOrder,
  verifyCoupon,
  paymentRetry,
  renderCheckoutPage,
  placeOrderWithBuyNow,
  verifyRazorpayPayment,
} from "../controllers/user/checkout.controller.js";
import {
  returnOrder,
  cancelOrder,
  orderDetailsPage,
  renderOrderListPage,
} from "../controllers/user/order.controller.js";
import {
  myWallet,
  addMoneyToWallet,
} from "../controllers/user/wallet.controller.js";
import { review, editReview } from "../controllers/user/review.controller.js";
import { myCoupons } from "../controllers/user/coupon.controller.js";
import { helpPage, getAppPage } from "../controllers/user/others.controller.js";

router.get("/", loadUserData, renderHomePage);
router.get("/home", loadUserData, renderHomePage);
router.get("/login", verifyToken, renderLoginPage);
router.get("/signup", verifyToken, renderSignupPage);
router.get("/page-not-found", verifyToken, pageNotFound);
router.get("/reset-password/:code", renderNewPasswordPage);
router.get("/otp-message", verifyToken, renderOtpStatusPage);
router.get("/forgot-password", verifyToken, renderForgotPasswordPage);
router.get("/otp-verification", verifyToken, renderpOtpVerificationPage);
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  googleCallbackHandler
);
router.post("/resend-otp", handleResendOTP);
router.post("/reset-password", handleResetPassword);
router.post("/login", verifyToken, handleUserLogin);
router.post("/signup", verifyToken, handleUserSignup);
router.post("/forgot-password", verifyToken, handleForgotPassword);
router.post("/otp-verification", verifyToken, handleOTPVerification);

// Product, Category & Sub Category Management
router.get("/shop", loadUserData, renderShopPage);
router.get("/product/:productId/:variantId", loadUserData, renderProductPage);

// Account Mangement
router.get("/my-account", loadUserData, renderMyAccountPage);
router.post(
  "/my-account",
  upload.single("profile-pic"),
  loadUserData,
  handleProfileUpdate
);

// Address Management
router.post("/add-address", loadUserData, handleAddAddress);
router.get("/manage-address", loadUserData, renderManageAddressPage);
router.post("/remove-address/:addressId", loadUserData, removeAddress);

router.get("/edit-address/:id", loadUserData, editAddressPage);
router.post("/edit-address/:addressId", loadUserData, updateAddress);

// Cart Management
router.post("/buy-now", loadUserData, buyNow);
router.get("/my-cart", loadUserData, renderCartPage);
router.post("/add-to-cart", loadUserData, addToCart);
router.post("/remove-cart-product", loadUserData, removeCartProduct);
router.patch("/update-cart-product", loadUserData, updateCartPageProduct);

// Checkout Mangement
router.get("/checkout", loadUserData, renderCheckoutPage);
router.post("/place-order", loadUserData, placeOrder);
router.post("/verify-coupon", loadUserData, verifyCoupon);
router.get("/placeOrderWithBuyNow", loadUserData, placeOrderWithBuyNow);
router.post("/verify-razorpay-payment", loadUserData, verifyRazorpayPayment);

// Order Management
router.get("/my-orders", loadUserData, renderOrderListPage);
router.patch("/cancel-order", loadUserData, cancelOrder);
router.patch("/return-order", loadUserData, returnOrder);
router.post("/payment-failed-retry", loadUserData, paymentRetry);
router.get(
  "/product-details/:orderId/:productId/:variantId/:addressId",
  loadUserData,
  orderDetailsPage
);
//Wish list Management
router.get("/my-wishlist", loadUserData, renderWishlistPage);
router.post("/add-to-wishlist/:id", loadUserData, addToWishlist);

// Wallet Managent
router.get("/my-wallet", loadUserData, myWallet);
router.post("/add-money-to-wallet", loadUserData, addMoneyToWallet);

// Coupon Management
router.get("/my-coupons", loadUserData, myCoupons);

// Rewview Mangement
router.post("/submit-review", loadUserData, review);
router.patch("/edit-review/:reviewId", loadUserData, editReview);

// Other Page Management
router.get("/help", loadUserData, helpPage);
router.get("/get-app", loadUserData, getAppPage);

router.get("/logout", loadUserData, handleUserLogout);

export default router;
