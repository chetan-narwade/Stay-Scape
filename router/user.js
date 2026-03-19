const express        = require('express');
const router         = express.Router();
const passport       = require('passport');
const wrapAsync      = require('../utils/wrapAsync');
const userController = require("../controllers/user");

// ── Local auth ─────────────────────────────────────────────
router.get('/login',   userController.renderLogin);
router.get('/signup',  userController.renderSignup);
router.get('/logout',  userController.logout);


router.get('/forgot-password',  userController.renderForgotPassword);
router.post('/forgot-password', wrapAsync(userController.sendForgotOtp));
router.post('/reset-password',  wrapAsync(userController.resetPassword));

router.post('/signup', wrapAsync(userController.signup));
router.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash:    true
  }),
  userController.login
);

// ── OTP ────────────────────────────────────────────────────
router.post('/send-otp',   wrapAsync(userController.sendOtp));
router.post('/verify-otp', wrapAsync(userController.verifyOtp));

// ── Google OAuth ───────────────────────────────────────────
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    failureFlash:    true
  }),
  userController.oauthSuccess
);

module.exports = router;
