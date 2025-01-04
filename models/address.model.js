import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  city: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  land_mark: {
    type: String,
    required: false
  },
  address: {
    type: String,
    required: true
  },
  address_type: {
    type: String,
    required: true
  },
  pin_code: {
    type: Number,
    required: true
  },
  alternative_phone_no: {
    type: Number,
    required: false
  },
  alternative_email: {
    type: String,
    required: false
  }
});

const Address = mongoose.model('Address', addressSchema);

export default Address;
