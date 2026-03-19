const axios = require("axios");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/expressError");

const VALID_CATEGORIES = new Set([
    "villa", "flat", "room", "hostel",
    "beachfront", "mountain", "island", "farm"
]);

async function geocode(location, country) {
    const query = [location, country].filter(Boolean).join(", ");
    try {
        const geoRes = await axios.get(
            "https://nominatim.openstreetmap.org/search",
            {
                params: { format: "json", q: query, limit: 1 },
                headers: { "User-Agent": "StayScape-Student-Project" },
                timeout: 5000
            }
        );
        if (!geoRes.data || geoRes.data.length === 0) return null;
        const lat = parseFloat(geoRes.data[0].lat);
        const lon = parseFloat(geoRes.data[0].lon);
        if (isNaN(lat) || isNaN(lon)) return null;
        return { lat, lon };
    } catch (err) {
        console.error("Geocoding error:", err.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────
//  INDEX
// ─────────────────────────────────────────────────────────
module.exports.index = wrapAsync(async (req, res) => {

    const { q, location, category, minPrice, maxPrice, minRating } = req.query;
    let filter = {};

    const textTerm = (q && q.trim()) || (location && location.trim()) || "";
    if (textTerm) {
        filter.$or = [
            { title: { $regex: textTerm, $options: "i" } },
            { description: { $regex: textTerm, $options: "i" } },
            { location: { $regex: textTerm, $options: "i" } },
            { country: { $regex: textTerm, $options: "i" } }
        ];
    }

    if (category && VALID_CATEGORIES.has(category)) {
        filter.category = category;
    }

    const lo = minPrice !== "" && minPrice != null ? Number(minPrice) : null;
    const hi = maxPrice !== "" && maxPrice != null ? Number(maxPrice) : null;
    if (lo !== null || hi !== null) {
        filter.price = {};
        if (lo !== null && !isNaN(lo)) filter.price.$gte = lo;
        if (hi !== null && !isNaN(hi)) filter.price.$lte = hi;
    }

    const ratingVal = minRating !== "" && minRating != null ? Number(minRating) : null;
    if (ratingVal !== null && !isNaN(ratingVal)) {
        filter.avgRating = { $gte: ratingVal };
    }

    const allListings = await Listing.find(filter);

    // ✅ single res.render — no double-response possible here
    return res.render("listings/index.ejs", {
        allListings,
        q: q || "",
        location: location || "",
        category: category || "",
        minPrice: minPrice || "",
        maxPrice: maxPrice || "",
        minRating: minRating || ""
    });
});

module.exports.search = module.exports.index;

// ─────────────────────────────────────────────────────────
//  NEW
// ─────────────────────────────────────────────────────────
module.exports.new = (req, res) => {
    return res.render("listings/new.ejs");
};

// ─────────────────────────────────────────────────────────
//  CREATE
// ─────────────────────────────────────────────────────────
module.exports.create = wrapAsync(async (req, res) => {

    // ✅ return on every early exit so nothing runs after redirect
    if (!req.file) {
        req.flash("error", "Image is required.");
        return res.redirect("/listings/new");
    }

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {
        url: req.file.path,
        filename: req.file.filename
    };

    const coords = await geocode(newListing.location, newListing.country);
    if (!coords) {
        req.flash("error", "Location not found. Please enter a valid location and country.");
        return res.redirect("/listings/new");   // ✅ return — stops execution here
    }

    newListing.geometry = {
        type: "Point",
        coordinates: [coords.lon, coords.lat]
    };

    await newListing.save();
    req.flash("success", "Your listing has been published!");
    return res.redirect("/listings");           // ✅ return on final response too
});

// ─────────────────────────────────────────────────────────
//  SHOW
// ─────────────────────────────────────────────────────────
module.exports.show = wrapAsync(async (req, res) => {
    const listing = await Listing
        .findById(req.params.id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");

    if (!listing) {
        throw new ExpressError("Listing not found", 404);
    }

    // ✅ only paid bookings, only fields needed for display
    const bookings = await Booking
        .find({ listing: listing._id, isPaid: true })
        .populate("owner", "username")   // ✅ only fetch username, nothing else
        .select("startDate endDate owner");

    return res.render("listings/show.ejs", { listing, bookings });
});

// ─────────────────────────────────────────────────────────
//  EDIT
// ─────────────────────────────────────────────────────────
module.exports.edit = wrapAsync(async (req, res) => {

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        throw new ExpressError("Listing not found", 404);
    }

    return res.render("listings/edit.ejs", { listing });
});

// ─────────────────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────────────────
module.exports.update = wrapAsync(async (req, res) => {

    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        throw new ExpressError("Listing not found", 404);
    }

    const oldLocation = listing.location;
    const oldCountry = listing.country;

    // ── Pull the submitted data ────────────────────────────────
    const data = req.body.listing;

    // ✅ amenities fix — when NO checkboxes are ticked, the browser
    //    sends nothing at all for that field, so data.amenities is
    //    undefined. Object.assign would leave the old array intact.
    //    Explicitly default to [] so unchecking all amenities works.
    data.amenities = data.amenities || [];

    // ✅ numeric fields — HTML inputs always send strings.
    //    Mongoose will cast them, but being explicit avoids
    //    subtle bugs if validation runs before casting.
    if (data.bedrooms !== undefined) data.bedrooms = Number(data.bedrooms);
    if (data.bathrooms !== undefined) data.bathrooms = Number(data.bathrooms);
    if (data.maxGuests !== undefined) data.maxGuests = Number(data.maxGuests);
    if (data.price !== undefined) data.price = Number(data.price);

    // ✅ category guard — reject values not in the schema enum
    //    so a tampered form can't inject arbitrary strings
    const VALID_CATEGORIES = new Set([
        "villa", "flat", "room", "hostel",
        "beachfront", "mountain", "island", "farm"
    ]);
    if (data.category && !VALID_CATEGORIES.has(data.category)) {
        req.flash("error", "Invalid category selected.");
        return res.redirect(`/listings/${id}/edit`);
    }

    Object.assign(listing, data);

    // ── Re-geocode only if location or country changed ─────────
    const locationChanged =
        listing.location !== oldLocation ||
        listing.country !== oldCountry;

    if (locationChanged) {
        const coords = await geocode(listing.location, listing.country);
        if (!coords) {
            req.flash("error", "Location not found. Please enter a valid location and country.");
            return res.redirect(`/listings/${id}/edit`);
        }
        listing.geometry = {
            type: "Point",
            coordinates: [coords.lon, coords.lat]   // GeoJSON: [lng, lat]
        };
    }

    // ── Update image only if a new file was uploaded ───────────
    if (req.file) {
        listing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    await listing.save();

    req.flash("success", "Listing updated successfully!");
    return res.redirect(`/listings/${listing._id}`);
});

// ─────────────────────────────────────────────────────────
//  DELETE
// ─────────────────────────────────────────────────────────
module.exports.delete = wrapAsync(async (req, res) => {

    const deletedListing = await Listing.findByIdAndDelete(req.params.id);

    if (!deletedListing) {
        throw new ExpressError("Listing not found", 404);
    }

    req.flash("success", "Listing deleted successfully!");
    return res.redirect("/listings");
});
