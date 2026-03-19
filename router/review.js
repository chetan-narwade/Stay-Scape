const express = require("express");
const router = express.Router({ mergeParams: true });

const reviewsController = require("../controllers/review");
const { isLoggedIn, isReviewAuthor } =require('../middleware');
const wrapAsync = require("../utils/wrapAsync");


// ════════════════════════════════════════════════════════
//  ADD REVIEW  —  POST /listings/:id/reviews
// ════════════════════════════════════════════════════════
router.post(
    "/",
    isLoggedIn,
    wrapAsync(reviewsController.add)
);

// ════════════════════════════════════════════════════════
//  DELETE REVIEW  —  DELETE /listings/:id/reviews/:reviewId
// ════════════════════════════════════════════════════════
router.delete(
    "/:reviewId",
    isLoggedIn,
    wrapAsync(isReviewAuthor),  // ✅ FIX: wrap async middleware
    wrapAsync(reviewsController.delete)
);

module.exports = router;