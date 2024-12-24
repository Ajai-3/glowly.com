import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    isListed: {
        type: Boolean,
        default: true 
    },
    deleted_at: {
       type: Date,
       default: null
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const Subcategory = mongoose.model('Subcategory', subcategorySchema);
export default Subcategory;
