const User = require('../models/user');
const { sendOTP } = require('../utils/mailer');
const { generateOTP } = require('../utils/otp');

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

    // ✅ Strong password check
    const pwdError = validatePassword(password);
    if (pwdError) {
      req.flash('error', pwdError);
      return res.redirect('/signup');
    }

    const existingUser = await User.findOne({ email });

    // ✅ Fully registered user — block
    if (existingUser && existingUser.isPending === false && existingUser.salt) {
      req.flash('error', 'An account with that email already exists.');
      return res.redirect('/signup');
    }

    // ✅ No pending record — OTP step was skipped
    if (!existingUser) {
      req.flash('error', 'Session expired. Please start signup again.');
      return res.redirect('/signup');
    }

    // ✅ Re-fetch fresh from DB to get latest otpVerified
    const freshUser = await User.collection.findOne({ email });

    if (!freshUser.otpVerified) {
      req.flash('error', 'Please verify your email with OTP first.');
      return res.redirect('/signup');
    }

    // ✅ Hash password — bypasses passport-local-mongoose hook
    const tempUser = new User({ email, username });
    tempUser.setPassword(password, async (err, userWithHash) => {
      if (err) {
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/signup');
      }

      try {
        // ✅ Update pending user with full details
        await User.collection.updateOne(
          { email },
          {
            $set: {
              username: username,
              salt: userWithHash.salt,
              hash: userWithHash.hash,
              isVerified: true,
              isPending: false,
              otpVerified: false,
            },
            $unset: { otp: '', otpExpiry: '' }
          }
        );

        // ✅ Re-fetch the FULLY UPDATED user from DB
        const savedUser = await User.findOne({ email });

        // ✅ FIX: Set session manually — avoids passport re-running
        // Local Strategy on stale cached user object
        req.session.passport = { user: savedUser._id.toString() };
        req.session.save((sessionErr) => {
          if (sessionErr) return next(sessionErr);
          req.user = savedUser;
          req.flash('success', 'Welcome to StayScape!');
          return res.redirect('/listings');
        });

      } catch (saveErr) {
        console.error('❌ saveErr:', saveErr);
        req.flash('error', saveErr.message);
        return res.redirect('/signup');
      }
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

// ─────────────────────────────────────────────────────────
//  SEND OTP
// ─────────────────────────────────────────────────────────
module.exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ success: false, message: 'Email is required' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: 'Invalid email address' });

  try {
    const otp = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.findOne({ email });

    if (!user) {
      // ✅ New email — create PENDING user
      await User.collection.insertOne({
        email,
        username: '__pending__',
        otp,
        otpExpiry: expiry,
        otpVerified: false,
        isPending: true,
        isVerified: false,
        createdAt: new Date()
      });

    } else if (user.googleId && !user.salt) {
      // ✅ Google-only user — block OTP, suggest Google
      return res.status(400).json({
        success: false,
        message: 'This account uses Google login. Please use "Continue with Google" instead.'
      });

    } else if (!user.isPending && user.salt) {
      // ✅ Fully registered user — OTP Login flow
      await User.collection.updateOne(
        { email },
        { $set: { otp, otpExpiry: expiry } }
      );

    } else {
      // ✅ Pending signup user — update OTP
      await User.collection.updateOne(
        { email },
        { $set: { otp, otpExpiry: expiry, otpVerified: false } }
      );
    }

    await sendOTP(email, otp);
    return res.json({ success: true, message: 'OTP sent to your email' });

  } catch (err) {
    console.error('sendOtp error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────
//  VERIFY OTP
// ─────────────────────────────────────────────────────────
module.exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });

  try {
    const user = await User.findOne({ email });

    if (!user || !user.otp)
      return res.status(400).json({ success: false, message: 'OTP not found. Please request a new one.' });

    if (user.otpExpiry < new Date()) {
      await User.collection.updateOne({ email }, { $unset: { otp: '', otpExpiry: '' } });
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (user.otp !== otp)
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });

    // ✅ Clear OTP and mark verified
    await User.collection.updateOne(
      { email },
      { $unset: { otp: '', otpExpiry: '' }, $set: { otpVerified: true } }
    );

    // ✅ Fully registered → login directly (OTP Login flow)
    if (!user.isPending && user.salt) {
      const updatedUser = await User.findOne({ email });

      // ✅ FIX: Use session directly for OTP login too
      req.session.passport = { user: updatedUser._id.toString() };
      req.session.save((sessionErr) => {
        if (sessionErr)
          return res.status(500).json({ success: false, message: 'Login failed.' });
        req.user = updatedUser;
        return res.json({
          success: true,
          type: 'login',
          redirect: '/listings'
        });
      });

    } else {
      // ✅ Pending signup → go to password step
      return res.json({
        success: true,
        type: 'signup'
      });
    }

  } catch (err) {
    console.error('verifyOtp error:', err.message);
    return res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
};

// ─────────────────────────────────────────────────────────
//  OAUTH SUCCESS
// ─────────────────────────────────────────────────────────
module.exports.oauthSuccess = (req, res) => {
  req.flash('success', `Welcome, ${req.user.username || req.user.email}!`);
  const redirectUrl = res.locals.returnTo || '/listings';
  delete req.session.returnTo;
  res.redirect(redirectUrl);
};


// ─────────────────────────────────────────────────────────
//  RENDER FORGOT PASSWORD
// ─────────────────────────────────────────────────────────
module.exports.renderForgotPassword = (req, res) => res.render('users/forgot-password');

// ─────────────────────────────────────────────────────────
//  SEND FORGOT PASSWORD OTP
// ─────────────────────────────────────────────────────────
module.exports.sendForgotOtp = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    const user = await User.findOne({ email });

    if (!user || user.isPending) {
      return res.status(400).json({ success: false, message: 'No account found with that email.' });
    }

    if (user.googleId && !user.salt) {
      return res.status(400).json({ success: false, message: 'This account uses Google login. No password to reset.' });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.collection.updateOne(
      { email },
      { $set: { otp, otpExpiry: expiry } }
    );

    await sendOTP(email, otp);
    return res.json({ success: true, message: 'OTP sent to your email' });

  } catch (err) {
    console.error('sendForgotOtp error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────
//  RESET PASSWORD
// ─────────────────────────────────────────────────────────
module.exports.resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password)
    return res.status(400).json({ success: false, message: 'All fields are required.' });

  const pwdError = validatePassword(password);
  if (pwdError)
    return res.status(400).json({ success: false, message: pwdError });

  try {
    const user = await User.collection.findOne({ email });

    if (!user)
      return res.status(400).json({ success: false, message: 'No account found.' });

    if (!user.otp)
      return res.status(400).json({ success: false, message: 'OTP not found. Please request a new one.' });

    if (user.otpExpiry < new Date()) {
      await User.collection.updateOne({ email }, { $unset: { otp: '', otpExpiry: '' } });
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (user.otp !== otp)
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });

    // ✅ Hash new password
    const mongooseUser = new User({ email, username: user.username });
    mongooseUser.setPassword(password, async (err, userWithHash) => {
      if (err)
        return res.status(500).json({ success: false, message: 'Failed to reset password.' });

      await User.collection.updateOne(
        { email },
        {
          $set: { salt: userWithHash.salt, hash: userWithHash.hash },
          $unset: { otp: '', otpExpiry: '' }
        }
      );

      return res.json({ success: true, message: 'Password reset successfully!' });
    });

  } catch (err) {
    console.error('resetPassword error:', err.message);
    return res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
};