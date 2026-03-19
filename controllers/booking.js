const ExpressError = require("../utils/ExpressError");
const Booking      = require("../models/booking");
const Listing      = require("../models/listing");

// ─────────────────────────────────────────────────────────
//  BOOK  —  GET /bookings/:id/book
// ─────────────────────────────────────────────────────────
module.exports.book = async (req, res) => {

    const listing = await Listing
        .findById(req.params.id)
        .populate("owner");

    if (!listing) {
        throw new ExpressError("Listing not found", 404);
    }

    const bookings = await Booking
        .find({ listing: listing._id, isPaid: true })
        .populate("owner", "username")
        .select("startDate endDate owner");

    // ✅ FIX: Use date-only strings to avoid timezone shift
    // new Date(isoString) in India (UTC+5:30) shifts dates back by 5.5hrs
    // Using split('T')[0] gives "YYYY-MM-DD" which parses correctly in JS
    const bookedRanges = bookings.map(b => ({
        start: b.startDate.toISOString().split('T')[0],
        end:   b.endDate.toISOString().split('T')[0]
    }));

    return res.render("listings/booking.ejs", { listing, bookings, bookedRanges });
};

// ─────────────────────────────────────────────────────────
//  CANCEL BOOKING  —  DELETE /bookings/:id/cancel
// ─────────────────────────────────────────────────────────
module.exports.cancelBooking = async (req, res) => {

    const booking = req.booking;

    if (!booking) {
        req.flash("error", "Booking not found.");
        return res.redirect("/listings");
    }

    const listingId = booking.listing;
    await Booking.findByIdAndDelete(req.params.id);

    req.flash("success", "Booking cancelled successfully.");
    return res.redirect(`/listings/${listingId}`);
};