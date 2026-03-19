const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment");

const { isLoggedIn } = require("../middleware");

router.post("/create-session", isLoggedIn, paymentController.createPaymentSession);

// ✅ GET /payment/success
router.get("/success", paymentController.paymentSuccess);

// ✅ GET /payment/cancel
router.get("/cancel", paymentController.paymentCancel);

module.exports = router;
