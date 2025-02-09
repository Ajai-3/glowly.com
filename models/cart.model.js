import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
    products: [
        {
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            variant_id: {
                type: String,
                require: true
            },
            quantity: { 
                type: Number,
                 default: 1
            },
            added_at: {
                type: Date,
                default: Date.now
            },
        }
    ],
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
