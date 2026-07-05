  const User = require('../models/user');

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────
  module.exports.renderLogin = (req, res) => res.render('users/login');
  module.exports.renderSignup = (req, res) => res.render('users/signup');

  // ─────────────────────────────────────────────────────────
  //  PASSWORD STRENGTH VALIDATOR
  // ─────────────────────────────────────────────────────────
  function validatePassword(password) {
    if (!password || password.length < 8)
      return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password))
      return 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(password))
      return 'Password must contain at least one number.';
    if (!/[^A-Za-z0-9]/.test(password))
      return 'Password must contain at least one special character.';
    return null;
  }

  // ─────────────────────────────────────────────────────────
  //  SIGNUP
  // ─────────────────────────────────────────────────────────
  module.exports.signup = async (req, res, next) => {
    try {
      const { email, username, password } = req.body;

      if (!email || !username || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/signup');
      }

      const pwdError = validatePassword(password);
      if (pwdError) {
        req.flash('error', pwdError);
        return res.redirect('/signup');
      }

      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        req.flash('error', 'An account with that email or username already exists.');
        return res.redirect('/signup');
      }

      const newUser = new User({ email, username });
      const registeredUser = await User.register(newUser, password);

      req.login(registeredUser, (err) => {
        if (err) return next(err);
        req.flash('success', 'Welcome to StayScape!');
        return res.redirect('/listings');
      });

    } catch (err) {
      console.error('❌ signup err:', err);
      req.flash('error', err.message);
      return res.redirect('/signup');
    }
  };

  // ─────────────────────────────────────────────────────────
  //  LOGIN
  // ─────────────────────────────────────────────────────────
  module.exports.login = (req, res) => {
    req.flash('success', `Welcome back, ${req.user.username || req.user.email}!`);
    const redirectUrl = res.locals.returnTo || '/listings';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  };

  // ─────────────────────────────────────────────────────────
  //  LOGOUT
  // ─────────────────────────────────────────────────────────
  module.exports.logout = (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      req.flash('success', 'Logged out successfully');
      res.redirect('/listings');
    });
  };