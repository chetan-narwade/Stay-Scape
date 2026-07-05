const User = require('../models/user');

// ─────────────────────────────────────────────────────────
//  RENDER
// ─────────────────────────────────────────────────────────
module.exports.renderLogin  = (req, res) => res.render('users/login');
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
//  SIGNUP (auto-login after account creation)
// ─────────────────────────────────────────────────────────
module.exports.signup = async (req, res, next) => {
  console.log('📝 [signup] request received:', { email: req.body.email, username: req.body.username });

  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      console.log('❌ [signup] missing fields');
      req.flash('error', 'All fields are required.');
      return res.redirect('/signup');
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      console.log('❌ [signup] password validation failed:', pwdError);
      req.flash('error', pwdError);
      return res.redirect('/signup');
    }

    console.log('🔍 [signup] checking for existing user...');
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('❌ [signup] user already exists:', existingUser.email);
      req.flash('error', 'An account with that email or username already exists.');
      return res.redirect('/signup');
    }

    console.log('👤 [signup] creating new user document...');
    const newUser = new User({ email, username });

    console.log('🔐 [signup] calling User.register() to hash password...');
    const registeredUser = await User.register(newUser, password);
    console.log('✅ [signup] user registered successfully:', registeredUser._id.toString());

    console.log('🔑 [signup] logging in new user via req.login()...');
    req.login(registeredUser, (err) => {
      if (err) {
        console.error('❌ [signup] req.login() error:', err);
        return next(err);
      }
      console.log('✅ [signup] session established, redirecting to /listings');
      req.flash('success', 'Welcome to StayScape!');
      return res.redirect('/listings');
    });

  } catch (err) {
    console.error('❌ [signup] caught error:', err.message);
    console.error(err.stack);
    req.flash('error', err.message);
    return res.redirect('/signup');
  }
};

// ─────────────────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────────────────
module.exports.login = (req, res) => {
  console.log('✅ [login] passport.authenticate succeeded for:', req.user.email);
  req.flash('success', `Welcome back, ${req.user.username || req.user.email}!`);
  const redirectUrl = res.locals.returnTo || '/listings';
  delete req.session.returnTo;
  console.log('➡️  [login] redirecting to:', redirectUrl);
  res.redirect(redirectUrl);
};

// ─────────────────────────────────────────────────────────
//  LOGOUT
// ─────────────────────────────────────────────────────────
module.exports.logout = (req, res, next) => {
  console.log('🚪 [logout] logging out user:', req.user ? req.user.email : 'unknown');
  req.logout(err => {
    if (err) {
      console.error('❌ [logout] error:', err);
      return next(err);
    }
    console.log('✅ [logout] success');
    req.flash('success', 'Logged out successfully');
    res.redirect('/listings');
  });
};