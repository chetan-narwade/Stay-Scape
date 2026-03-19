const wrapAsync    = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const Review       = require("../models/review");
const Listing      = require("../models/listing");

// ─────────────────────────────────────────────────────────
//  ADD REVIEW
// ─────────────────────────────────────────────────────────
module.exports.add = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) throw new ExpressError("Listing not found", 404);

    const review     = new Review(req.body.review);
    review.author    = req.user._id;
    review.listing   = listing._id;  // ✅ ADD: links review to listing for profile page

    listing.reviews.push(review._id);

    await review.save();
    await listing.save();

    req.flash("success", "Review added!");
    return res.redirect(`/listings/${listing._id}`);
};

// ─────────────────────────────────────────────────────────
//  DELETE REVIEW
// ─────────────────────────────────────────────────────────
module.exports.delete = async (req, res) => {
    const { id, reviewId } = req.params;

    const listing = await Listing.findById(id);
    if (!listing) throw new ExpressError("Listing not found", 404);

    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review deleted!");
    return res.redirect(`/listings/${id}`);
};
