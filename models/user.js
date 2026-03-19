const mongoose              = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({

    // ── Core fields ────────────────────────────────────────
    email: {
        type:      String,
        required:  true,
        unique:    true,
        trim:      true,
        lowercase: true
    },
    username: {
        type:     String,
        required: true,
        trim:     true
    },

    // ── Profile fields ─────────────────────────────────────
    fullName: {
        type:    String,
        default: '',
        trim:    true
    },
    phone: {
        type:    String,
        default: '',
        trim:    true
    },
    bio: {
        type:      String,
        default:   '',
        maxlength: 200,
        trim:      true
    },

    // ── Wishlist ───────────────────────────────────────────
    wishlist: [{
        type:    mongoose.Schema.Types.ObjectId,
        ref:     'Listing',
        default: []
    }],

    // ── Verification ───────────────────────────────────────
    isVerified: {
        type:    Boolean,
        default: false
    },
    isPending: {
        type:    Boolean,
        default: false
    },
    otpVerified: {
        type:    Boolean,
        default: false
    },
    otp:       String,
    otpExpiry: Date,

    // ── OAuth ──────────────────────────────────────────────
    googleId: {
        type:    String,
        default: null
    }

}, { timestamps: true });

// ✅ passwordRequired: false allows Google/OTP users without a password
userSchema.plugin(passportLocalMongoose, {
    usernameField:    'email',
    passwordRequired: false
});

module.exports = mongoose.model('User', userSchema);