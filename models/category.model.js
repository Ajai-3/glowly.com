import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    subcategories: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Subcategory',
    }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Creating the model
const Category = mongoose.model('Category', categorySchema);

export default Category;
