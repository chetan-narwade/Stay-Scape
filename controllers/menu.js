const mongoose  = require("mongoose");
const Listing   = require("../models/listing");
const Booking   = require("../models/booking");
const Review    = require("../models/review");
const User      = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");

// ─────────────────────────────────────────────────────────
//  HELPER — fetch all profile data
// ─────────────────────────────────────────────────────────
async function getProfileData(userId) {
    const [userListings, userBookings, userReviews] = await Promise.all([
        Listing.find({ owner: userId }).lean(),
        Booking.find({ owner: userId })
            .populate('listing', 'title location country')
            .sort({ startDate: -1 })
            .lean(),
        Review.find({ author: userId })
            .populate({ path: 'listing', select: 'title _id', strictPopulate: false })
            .sort({ createdAt: -1 })
            .lean()
    ]);
    return { userListings, userBookings, userReviews };
}

// ─────────────────────────────────────────────────────────
//  HELPER — render profile with all data
// ─────────────────────────────────────────────────────────
async function renderProfilePage(req, res) {
    const { userListings, userBookings, userReviews } = await getProfileData(req.user._id);
    return res.render('menu/profile.ejs', {
        totalListings: userListings.length,
        totalBookings: userBookings.length,
        totalReviews:  userReviews.length,
        userListings,
        userBookings,
        userReviews
    });
}

// ─────────────────────────────────────────────────────────
//  PROFILE — GET
// ─────────────────────────────────────────────────────────
module.exports.profile = async (req, res) => {
    return renderProfilePage(req, res);
};

// ─────────────────────────────────────────────────────────
//  UPDATE PROFILE — PUT
// ─────────────────────────────────────────────────────────
module.exports.updateProfile = async (req, res) => {
    const { username, email, fullName, phone, bio, password, confirmPassword } = req.body;
    const userId = req.user._id;

    const existingUsername = await User.collection.findOne({
        username,
        _id: { $ne: userId }
    });
    if (existingUsername) {
        req.flash('error', 'That username is already taken.');
        return renderProfilePage(req, res);
    }

    const existingEmail = await User.collection.findOne({
        email,
        _id: { $ne: userId }
    });
    if (existingEmail) {
        req.flash('error', 'That email is already in use.');
        return renderProfilePage(req, res);
    }

    if (password && password.trim()) {
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match.');
            return renderProfilePage(req, res);
        }
        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters.');
            return renderProfilePage(req, res);
        }
    }

    await User.collection.updateOne(
        { _id: userId },
        {
            $set: {
                username: username.trim(),
                email:    email.trim(),
                fullName: fullName ? fullName.trim() : '',
                phone:    phone    ? phone.trim()    : '',
                bio:      bio      ? bio.trim()      : '',
            }
        }
    );

    if (password && password.trim()) {
        const mongooseUser = await User.findById(userId);
        await new Promise((resolve, reject) => {
            mongooseUser.setPassword(password, async (err, userWithHash) => {
                if (err) return reject(err);
                await User.collection.updateOne(
                    { _id: userId },
                    { $set: { salt: userWithHash.salt, hash: userWithHash.hash } }
                );
                resolve();
            });
        });
        req.flash('success', 'Profile and password updated successfully!');
        return renderProfilePage(req, res);
    }

    req.flash('success', 'Profile updated successfully!');
    return renderProfilePage(req, res);
};

// ─────────────────────────────────────────────────────────
//  MY LISTINGS
// ─────────────────────────────────────────────────────────
module.exports.myListings = wrapAsync(async (req, res) => {
    const myListings = await Listing
        .find({ owner: req.user._id })
        .populate("reviews")
        .sort({ createdAt: -1 });
    return res.render("menu/mylisting.ejs", { myListings });
});

// ─────────────────────────────────────────────────────────
//  WISHLIST PAGE — GET
// ─────────────────────────────────────────────────────────
module.exports.wishlist = wrapAsync(async (req, res) => {
    const user = await User
        .findById(req.user._id)
        .populate({
            path: "wishlist",
            populate: { path: "owner", select: "username" }
        });

    if (!user) {
        req.flash("error", "User not found.");
        return res.redirect("/login");
    }

    const listings = user.wishlist.filter(l => l !== null);
    return res.render("menu/wishlist", { listings });
});

// ─────────────────────────────────────────────────────────
//  TOGGLE WISHLIST — POST /menu/wishlist/:listingId
// ─────────────────────────────────────────────────────────
module.exports.toggleWishlist = async (req, res, next) => {
    const { listingId } = req.params;

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.redirect("/login");
        }

        const alreadySaved = user.wishlist.some(
            (id) => id.toString() === listingId
        );

        const listingObjectId = new mongoose.Types.ObjectId(listingId);

        if (alreadySaved) {
            await User.collection.updateOne(
                { _id: user._id },
                { $pull: { wishlist: listingObjectId } }
            );
            req.flash('success', 'Removed from wishlist.');
        } else {
            await User.collection.updateOne(
                { _id: user._id },
                { $push: { wishlist: listingObjectId } }
            );
            req.flash('success', 'Added to wishlist!');
        }

        return res.redirect(`/listings/${listingId}`);

    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────
//  MY BOOKINGS
// ─────────────────────────────────────────────────────────
module.exports.bookings = wrapAsync(async (req, res) => {
    const bookings = await Booking
        .find({ owner: req.user._id })
        .populate({
            path:   "listing",
            select: "title location country image price _id"
        })
        .sort({ createdAt: -1 });
    return res.render("menu/mybooking.ejs", { bookings });
});