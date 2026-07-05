const passport = require('passport');
const User     = require('../models/user');

// passport-local-mongoose provides a ready-made local strategy
// configured to use 'email' as the username field (set in the schema plugin options)
passport.use(User.createStrategy());

// ── Serialize / Deserialize ────────────────────────────────
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

module.exports = passport;