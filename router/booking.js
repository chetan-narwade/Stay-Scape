const express = require("express");
const router = express.Router();
const multer = require("multer");

const listingsController = require("../controllers/booking"); // ✅ FIX: was "bookingController" but controllers/booking.js exports an object, not a function
const menuController = require("../controllers/menu");        // ✅ ADD — myListings lives here
const { storage } = require("../cloudConfig");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isOwner, isBookingOwner } = require("../middleware");

const upload = multer({ storage });

// Book a listing (GET form)
router.get("/:id/book", isLoggedIn, wrapAsync(listingsController.book));

// ✅ ADDED — Cancel booking
router.delete("/:id/cancel", isLoggedIn, isBookingOwner, wrapAsync(listingsController.cancelBooking));

router.delete("/:id/cancel", isLoggedIn, isBookingOwner, wrapAsync(listingsController.cancelBooking));

// ✅ FIX — was "router.export" which is not valid
module.exports = router;