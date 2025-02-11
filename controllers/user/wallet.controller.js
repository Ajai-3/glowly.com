import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import razorpay from "../../config/razorpay.js";
import Wallet from "../../models/wallet.model.js";
import Transaction from "../../models/transaction.model.js";

// ========================================================================================
// RENDER MY WALLET PAGE
// ========================================================================================
// Displays the user's wallet with account balance, transaction history, and payment options.
// ========================================================================================
export const myWallet = async (req, res, next) => {
  try {
    const { user, brands, token, wallet, cartCount, categories } = req;

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let transactions = [];
    let totalTransactions = 0;

    if (!token) {
      return res.redirect("/home");
    }
    if (wallet) {
      transactions = await Transaction.find({ wallet_id: wallet._id })
        .skip(skip)
        .limit(Number(limit))
        .sort({ date: -1 });

      totalTransactions = await Transaction.countDocuments({
        wallet_id: wallet._id,
      });
    }

    return res.render("user/my-wallet", {
      user,
      name: user ? user.name : "",
      cartCount,
      wallet,
      brands,
      categories,
      transactions,
      totalPages: Math.ceil(totalTransactions / limit),
      currentPage: Number(page),
      totalTransactions,
      limit,
    });
  } catch (error) {
    console.log("Error in myWallet:", error);
    next({ statusCode: 500, message: error.message });
  }
};

// ========================================================================================
// ADD MONEY TO WALLET USING RAZORPAY
// ========================================================================================
// Manages the process of adding funds to the user's wallet via Razorpay, updating the balance.
// ========================================================================================
export const addMoneyToWallet = async (req, res, next) => {
  try {
    const { user, token, wallet } = req;

    if (!token) {
      return res.redirect("/home");
    }

    const {
      amount,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    if (!amount || amount <= 0 || amount > 25000) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    let userWallet = wallet;
    if (!userWallet) {
      userWallet = new Wallet({
        user_id: user.userId,
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userWallet.save();
    }

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
    }

    // Verify Razorpay payment
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Update Wallet and create Transaction
    userWallet.balance += amount;

    const transaction = new Transaction({
      wallet_id: userWallet._id,
      user_id: user.userId,
      transaction_type: "wallet",
      description: "Money added",
      amount,
      type: "Credited",
    });

    await Promise.all([userWallet.save(), transaction.save()]);

    return res.json({
      message: "Payment verified and wallet updated",
      balance: userWallet.balance,
      transaction,
    });
  } catch (error) {
    console.error("Error in addMoney to wallet", error);
    next({ statusCode: 500, message: error.message });
  }
};
