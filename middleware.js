// ✅ FIX: change ../../ to ./ since middleware.js is at root level
const Listing     = require("./models/listing");
const Review      = require("./models/review");
const Booking     = require("./models/booking");
const { listingSchema, reviewSchema } = require("./schema");
const ExpressError = require("./utils/expressError");

// ─────────────────────────────────────────────────────────
//  isLoggedIn
// ─────────────────────────────────────────────────────────
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be signed in first!");
        return res.redirect("/login");
    }
    return next();
};

// ─────────────────────────────────────────────────────────
//  saveRedirectUrl
// ─────────────────────────────────────────────────────────
module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    return next();
};

// ─────────────────────────────────────────────────────────
//  isOwner
// ─────────────────────────────────────────────────────────
module.exports.isOwner = async (req, res, next) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    if (!req.user) {
        req.flash("error", "You must be signed in first!");
        return res.redirect("/login");
    }

    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "You do not have permission to do that!");
        return res.redirect(`/listings/${id}`);
    }

    return next();
};

// ─────────────────────────────────────────────────────────
//  isBookingOwner
// ─────────────────────────────────────────────────────────
module.exports.isBookingOwner = async (req, res, next) => {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
        req.flash("error", "Booking not found");
        return res.redirect("/listings");
    }

    if (!booking.owner.equals(req.user._id)) {
        req.flash("error", "You don't have permission to cancel this booking");
        return res.redirect("/listings");
    }

    req.booking = booking;
    return next();
};

// ─────────────────────────────────────────────────────────
//  isReviewAuthor
// ─────────────────────────────────────────────────────────
module.exports.isReviewAuthor = async (req, res, next) => {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
        req.flash("error", "Review not found.");
        return res.redirect(`/listings/${req.params.id}`);
    }

    if (!review.author.equals(req.user._id)) {
        req.flash("error", "You don't have permission to delete this review.");
        return res.redirect(`/listings/${req.params.id}`);
    }

    req.review = review;
    return next();
};

// ─────────────────────────────────────────────────────────
//  validateListing
// ─────────────────────────────────────────────────────────
module.exports.validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(", ");
        throw new ExpressError(msg, 400);
    }
    return next();
};

// ─────────────────────────────────────────────────────────
//  validateReview
// ─────────────────────────────────────────────────────────
module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(", ");
        throw new ExpressError(msg, 400);
    }
    return next();
};