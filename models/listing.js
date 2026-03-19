const mongoose = require("mongoose");
const Review = require("./review");

const listingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80                         // matches form maxlength="80"
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 800                        // matches form maxlength="800"
    },
    image: {
        filename: {
            type: String
        },
        url: {
            type: String
        }
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },

    // ── Property type ──────────────────────────────────────────
    // Form has 8 categories: villa, flat, room, hostel,
    //                        beachfront, mountain, island, farm
    category: {
        type: String,
        enum: ["villa", "flat", "room", "hostel",
               "beachfront", "mountain", "island", "farm"],
        required: true
    },

    // ── Space details ──────────────────────────────────────────
    // These three counter inputs were in the form but missing
    // from the schema entirely
    bedrooms: {
        type: Number,
        required: true,
        min: 0,
        max: 50,
        default: 1
    },
    bathrooms: {
        type: Number,
        required: true,
        min: 0,
        max: 50,
        default: 1
    },
    maxGuests: {
        type: Number,
        required: true,
        min: 1,
        max: 50,
        default: 2
    },

    // ── Amenities ──────────────────────────────────────────────
    // Checkboxes sent as listing[amenities][] — needs an array.
    // Possible values mirror the form's checkbox values exactly.
    amenities: {
        type: [String],
        enum: [
            "Wi-Fi",
            "Pool",
            "Air conditioning",
            "Kitchen",
            "Parking",
            "TV",
            "Gym",
            "Pet friendly",
            "Breakfast"
        ],
        default: []
    },

    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    geometry: {
        type: {
            type: String,
            enum: ["Point"],
            required: true
        },
        coordinates: {
            type: [Number],   // [longitude, latitude]
            required: true
        }
    }
});

// Cascade-delete reviews when a listing is removed
listingSchema.post("findOneAndDelete", async function (listing) {
    if (listing) {
        await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
});

// Full-text search index — added country to match location-based searches
listingSchema.index({ title: "text", description: "text",
                      location: "text",  country: "text" });

// Geospatial index for map queries
listingSchema.index({ geometry: "2dsphere" });

module.exports = mongoose.model("Listing", listingSchema);