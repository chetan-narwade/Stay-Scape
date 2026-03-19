const express = require("express");
const router = express.Router();
const multer = require("multer");

const listingsController = require("../controllers/listing");
const { storage } = require("../cloudConfig");
const wrapAsync = require("../utils/wrapAsync");
const Listing = require("../models/listing");
const { isLoggedIn, isOwner , isBookingOwner} =  require("../middleware");

const upload = multer({ storage });

// ════════════════════════════════════════════════════════
//  STATIC / COLLECTION ROUTES
//  Must come before /:id so Express doesn't treat
//  "new", "search" etc. as dynamic id params
// ════════════════════════════════════════════════════════

// INDEX
router.get("/", wrapAsync(listingsController.index));

// SEARCH
router.get("/search", wrapAsync(listingsController.search));

// NEW  (GET form)
router.get("/new", isLoggedIn, listingsController.new);

// CREATE  (POST)
// ✅ isLoggedIn must come BEFORE upload — auth check before
//    processing the multipart body (saves bandwidth + security)
router.post(
    "/",
    isLoggedIn,
    upload.single("listing[image]"),
    wrapAsync(listingsController.create)
);

// ════════════════════════════════════════════════════════
//  DYNAMIC / DOCUMENT ROUTES  /:id
// ════════════════════════════════════════════════════════

// SHOW
router.get("/:id", wrapAsync(listingsController.show));

// EDIT  (GET form)
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingsController.edit));

// UPDATE
router.put(
    "/:id",
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    wrapAsync(listingsController.update)
);

// DELETE listing
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(listingsController.delete));



module.exports = router;