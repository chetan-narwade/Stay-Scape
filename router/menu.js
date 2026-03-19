const express        = require("express");
const router         = express.Router();
const menuController = require("../controllers/menu");
const { isLoggedIn } = require("../middleware");
const wrapAsync      = require("../utils/wrapAsync");

router.get('/profile',              isLoggedIn, wrapAsync(menuController.profile));
router.put('/profile',              isLoggedIn, wrapAsync(menuController.updateProfile));
router.get('/mylistings',           isLoggedIn, wrapAsync(menuController.myListings));
router.get('/wishlist',             isLoggedIn, wrapAsync(menuController.wishlist));
router.post('/wishlist/:listingId', isLoggedIn, wrapAsync(menuController.toggleWishlist)); // ✅ ADD
router.get('/bookings',             isLoggedIn, wrapAsync(menuController.bookings));

module.exports = router;