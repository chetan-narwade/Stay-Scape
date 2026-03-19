const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        listing: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      "Listing",
            required: true
        },

        // ✅ renamed from "user" → "owner" to match your schema convention
        //    BUT payment controller uses "user: req.user._id" — fix both
        //    to use the same field name. Using "owner" here to match your model.
        owner: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      "User",
            required: true
        },

        startDate: {
            type:     Date,
            required: true
        },

        endDate: {
            type:     Date,
            required: true
        },

        // ✅ totalAmount was missing — payment controller stores it
        //    and bookings page reads it for GST breakdown display
        totalAmount: {
            type: Number,
            min:  0
        },

        isPaid: {
            type:    Boolean,
            default: false
        },

        paymentId: {
            type: String
        },

        paidAt: {
            type: Date
        }
    },
    {
        timestamps: true   // ✅ adds createdAt + updatedAt automatically
                           //    required for .sort({ createdAt: -1 }) in booking controller
    }
);

module.exports = mongoose.model("Booking", bookingSchema);