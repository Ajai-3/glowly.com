import mongoose from "mongoose";

const { Schema, model } = mongoose;

const transactionSchema = new Schema({
  wallet_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["Credited", "Debited", "Refund", "Cashback"],
    required: true,
  },
  description: {
    type: String,
    enum: [
      "Order placed",
      "Order returned",
      "Order canceled",
      "Money added",
      "Refund",
      "Cashback",
    ],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = model("Transaction", transactionSchema);

export default Transaction;
