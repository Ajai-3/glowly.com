import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const walletSchema = new Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
});

const Wallet = model('Wallet', walletSchema);

export default Wallet;
