import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['percentage', 'flat'],
        required: true
    },
    users: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'User',
                required: true
            },
            usedCount: {
                type: Number,
                default: 0 
            }
        }
    ],
    discountValue: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    minPrice: {
        type: Number,
        required: true
    },
    maxPrice: {
        type: Number,
        required: true
    },
    usageLimit: {
        type: Number,
        default: 1
    },
    totalUsedCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isDelete: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
