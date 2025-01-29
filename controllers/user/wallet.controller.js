import jwt from "jsonwebtoken";
import crypto from "crypto"
import dotenv from "dotenv";dotenv.config()
import razorpay from "../../config/razorpay.js"
import Cart from "../../models/cart.model.js";
import User from "../../models/user.model.js";
import Wallet from "../../models/wallet.model.js";
import Category from "../../models/category.model.js";
import Transaction from "../../models/transaction.model.js";




export const myWallet = async (req, res, next) => {
  try {
    const { user, wishlist, token, wallet, cart, cartCount, categories } = req;
    // const token = req.cookies.token;

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // let user = null;
    // let cart = null;
    // let wallet = null;

    let transactions = [];
    let totalTransactions = 0;

    if (!token) {
      return res.redirect("/home");
    }

    // try {
    //   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    //   user = decoded;

    //   cart = await Cart.findOne({ user_id: user.userId });
    //   wallet = await Wallet.findOne({ user_id: user.userId });

      
    // } catch (error) {
    //   console.log("Invalid or expired token:", error);
    // }
    // const cartCount = cart?.products?.length || 0;

    // const categories = await Category.find({ isListed: true }).populate({
    //   path: "subcategories",
    //   match: { isListed: true },
    // });

    if (wallet) {
      transactions = await Transaction.find({ wallet_id: wallet._id })
        .skip(skip)
        .limit(Number(limit))
        .sort({ date: -1 });

      totalTransactions = await Transaction.countDocuments({ wallet_id: wallet._id });
    }
    

    return res.render("user/my-wallet", {
      user,
      name: user ? user.name : "",
      cartCount,
      wallet,
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


export const addMoneyToWallet = async (req, res, next) => {
  try {
    const { user, token, wallet } = req;

    if (!token) {
      return res.redirect("/home");
    }

    const { amount, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

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
      console.log("New wallet created for user:", user.userId);
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
    await userWallet.save();

    const transaction = new Transaction({
      wallet_id: userWallet._id,
      user_id: user.userId,
      transaction_type: "wallet",
      description: "money added",
      amount,
      type: "credited",
    });
    await transaction.save();

    return res.json({
      message: "Payment verified and wallet updated",
      balance: userWallet.balance,
      transaction,
    });
  } catch (error) {
    console.error("Error in addMoneyToWallet", error);
    next({ statusCode: 500, message: error.message });
  }
};


// export const addMoneyToWallet = async (req, res, next) => {
//   try {
//     const { user, token, wallet } = req;
//     // const token = req.cookies.token;
//     if (!token) {
//       return res.redirect("/home");
//     }

//     const { amount, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
//     if (!amount || amount <= 0 || amount > 25000) {
//       return res.status(400).json({ error: "Invalid amount" });
//     }

//     // Verify the user token
//     // let user;
//     // try {
//     //   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//     //   user = decoded;
//     // } catch (error) {
//     //   console.log("Invalid or expired token:", error);
//     //   return res.status(401).json({ error: "Unauthorized" });
//     // }

//     // Find the user's wallet
//     // const wallet = await Wallet.findOne({ user_id: user.userId });
    
//   // }
//   if (!wallet) {
//     const newWallet = new Wallet({
//         user_id: user.userId,
//         balance: 0, 
//         createdAt: new Date(),
//         updatedAt: new Date()
//     });

//     await newWallet.save();
//     console.log("New wallet created for user:", user.userId);

//     // If payment details are not provided, create a Razorpay order
//     if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
//       const options = {
//         amount: amount * 100, 
//         currency: "INR",
//         receipt: `receipt_${Date.now()}`,
//       };
//       const order = await razorpay.orders.create(options);

//       return res.json({
//         order,
//         key: process.env.RAZORPAY_KEY_ID,
//       });
//     } else {
//       // Verify Razorpay payment
//       const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
//       hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
//       const generated_signature = hmac.digest('hex');

//       if (generated_signature !== razorpay_signature) {
//         return res.status(400).json({ error: "Invalid signature" });
//       }

//       // Update Wallet and create Transaction
//       wallet.balance += amount;
//       await wallet.save();

//       const transaction = new Transaction({
//         wallet_id: wallet._id,
//         user_id: user.userId,
//         transaction_type: "wallet",
//         description: "money added",
//         amount,
//         type: 'credited',
//       });
//       await transaction.save();

//       return res.json({
//         message: "Payment verified and wallet updated",
//         balance: wallet.balance,
//         transaction,
//       });
//     }
//   } catch (error) {
//     console.error("Error in addMoneyToWallet", error);
//     next({ statusCode: 500, message: error.message });
//   }
//   }
// };