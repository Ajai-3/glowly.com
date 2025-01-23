import jwt from "jsonwebtoken";
import crypto from "crypto"
import dotenv from "dotenv";dotenv.config()
import razorpay from "../../config/razorpay.js"
import Cart from "../../models/cart.model.js";
import User from "../../models/user.model.js";
import Wallet from "../../models/wallet.model.js";
import Category from "../../models/category.model.js";
import Transaction from "../../models/transaction.model.js";

export const myWallet = async (req, res) => {
  try {
    const token = req.cookies.token;
    let user;
    let cart;
    let wallet;

    if (!token) {
      return res.redirect("/home");
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        user = decoded;
        cart = await Cart.findOne({ user_id: user.userId });
        wallet = await Wallet.findOne({ user_id: user.userId })
      } catch (error) {
        console.log("Invalid or expired token:", error);
      }
    }
    const cartCount = cart?.products?.length || 0;
    const categories = await Category.find({ isListed: true }).populate({
      path: "subcategories",
      match: { isListed: true },
    });

    return res.render("user/my-wallet", {
      user,
      name: user ? user.name : "",
      cartCount,
      wallet,
      categories,
    });
  } catch (error) {
    console.log("Error in my wallet");
  }
};



export const addMoneyToWallet = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { amount, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!amount || amount <= 0 || amount > 25000) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Verify the user token
    let user;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      user = decoded;
    } catch (error) {
      console.log("Invalid or expired token:", error);
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find the user's wallet
    const wallet = await Wallet.findOne({ user_id: user.userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // If payment details are not provided, create a Razorpay order
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      const options = {
        amount: amount * 100, 
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };
      const order = await razorpay.orders.create(options);

      return res.json({
        order,
        key: process.env.RAZORPAY_KEY_ID,
      });
    } else {
      // Verify Razorpay payment
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ error: "Invalid signature" });
      }

      // Update Wallet and create Transaction
      wallet.balance += amount;
      await wallet.save();

      const transaction = new Transaction({
        wallet_id: wallet._id,
        user_id: user.userId,
        transaction_type: "wallet",
        amount,
        type: 'credited',
      });
      await transaction.save();

      return res.json({
        message: "Payment verified and wallet updated",
        balance: wallet.balance,
        transaction,
      });
    }
  } catch (error) {
    console.error("Error in addMoneyToWallet", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};