import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const transactionSchema = new Schema({
  wallet_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet', 
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['credited', 'debited', 'refund', 'cashback'], 
    required: true,
  },
  description: {
    type: String,
    enum: ['order placed', 'order returned', 'money added', 'refund', 'cashback'],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now, 
  },
});

const Transaction = model('Transaction', transactionSchema);

export default Transaction;
