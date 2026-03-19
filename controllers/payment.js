const wrapAsync = require("../utils/wrapAsync");
const Stripe    = require("stripe");
const Booking   = require("../models/booking");
const Listing   = require("../models/listing");


const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY);

const GST_RATE = 0.18;
const BASE_URL = process.env.BASE_URL || "https://stay-scape-envy.onrender.com";

// ─────────────────────────────────────────────────────────
//  CREATE SESSION  —  POST /payment/create-session
//  ⚠️  Called via fetch() — NEVER use res.redirect or
//      req.flash here. Always return JSON.
// ─────────────────────────────────────────────────────────
module.exports.createPaymentSession = wrapAsync(async (req, res) => {

    const { listingId, startDate, endDate } = req.body;

    // ── 1. Validation ──────────────────────────────────────
    if (!listingId || !startDate || !endDate) {
        return res.status(400).json({ error: "Please fill all booking details." });
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Please select valid dates." });
    }

    if (end <= start) {
        return res.status(400).json({ error: "Check-out must be after check-in." });
    }

    // ── 2. Conflict check ──────────────────────────────────
    // ✅ only block if a PAID booking overlaps — unpaid/pending
    //    bookings from abandoned checkouts must not block dates
    const alreadyBooked = await Booking.findOne({
        listing: listingId,
        isPaid:  true,
        $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }]
    });

    if (alreadyBooked) {
        return res.status(400).json({
            error: "These dates are already booked. Please select different dates."
        });
    }

    // ── 3. Listing lookup ──────────────────────────────────
    const listing = await Listing.findById(listingId);
    if (!listing) {
        return res.status(404).json({ error: "Listing not found." });
    }

    // ── 4. Amount calculation ──────────────────────────────
    const days        = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const baseAmount  = days * listing.price;
    const gstAmount   = Math.round(baseAmount * GST_RATE);
    const totalAmount = baseAmount + gstAmount;

    // ── 5. Create pending booking ─────────────────────────
    const booking = await Booking.create({
        listing:     listingId,
        owner:       req.user._id,   // ✅ was "user" — schema field is "owner"
        startDate:   start,
        endDate:     end,
        totalAmount,
        isPaid:      false
    });

    // ── 6. Stripe session ─────────────────────────────────
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode:                 "payment",
        line_items: [
            {
                price_data: {
                    currency:     "inr",
                    product_data: {
                        name: `${listing.title} — ${days} night${days > 1 ? "s" : ""}`
                    },
                    unit_amount: Math.round(baseAmount * 100)
                },
                quantity: 1
            },
            {
                price_data: {
                    currency:     "inr",
                    product_data: { name: "GST (18%)" },
                    unit_amount:  Math.round(gstAmount * 100)
                },
                quantity: 1
            }
        ],
        metadata: {
            bookingId:   booking._id.toString(),
            totalAmount: totalAmount.toString()
        },
        success_url: `${BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${BASE_URL}/payment/cancel?bookingId=${booking._id}`
    });

    // ✅ always return JSON — client reads data.url
    return res.json({ url: session.url });
});

// ─────────────────────────────────────────────────────────
//  SUCCESS  —  GET /payment/success
//  Normal browser redirect — flash + redirect are fine here
// ─────────────────────────────────────────────────────────
module.exports.paymentSuccess = wrapAsync(async (req, res) => {

    const { session_id } = req.query;
    if (!session_id) return res.redirect("/");

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
        req.flash("error", "Payment was not completed.");
        return res.redirect("/");
    }

    const booking = await Booking.findById(session.metadata.bookingId);
    if (!booking) return res.redirect("/");

    if (!booking.isPaid) {
        booking.isPaid    = true;
        booking.paymentId = session.payment_intent;
        booking.paidAt    = new Date();
        await booking.save();
    }

    req.flash("success", "Booking confirmed! Your stay is all set.");
    return res.redirect(`/listings/${booking.listing}`);
});

// ─────────────────────────────────────────────────────────
//  CANCEL  —  GET /payment/cancel
// ─────────────────────────────────────────────────────────
module.exports.paymentCancel = wrapAsync(async (req, res) => {

    const { bookingId } = req.query;

    if (bookingId) {
        await Booking.findOneAndDelete({ _id: bookingId, isPaid: false });
    }

    req.flash("error", "Payment cancelled. Your booking was not confirmed.");
    return res.redirect("/");
});
