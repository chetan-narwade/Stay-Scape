const express        = require('express');
const router         = express.Router();
const passport       = require('passport');
const wrapAsync      = require('../utils/wrapAsync');
const userController = require("../controllers/user");

// ── Local auth ─────────────────────────────────────────────
router.get('/login',   userController.renderLogin);
router.get('/signup',  userController.renderSignup);
router.get('/logout',  userController.logout);

router.post('/signup', wrapAsync(userController.signup));
router.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash:    true
  }),
  userController.login
);

module.exports = router;