const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    comment: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // ✅ ADD THIS — links review back to its listing
    listing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing'
    }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);