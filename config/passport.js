const passport       = require('passport');
const LocalStrategy  = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User           = require('../models/user');

// ── Local Strategy ─────────────────────────────────────────
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        // ✅ Use collection.findOne to get RAW document (no mongoose caching)
        const user = await User.collection.findOne({ email });

        // ✅ No account found
        if (!user) {
            return done(null, false, { message: 'No account found with that email.' });
        }

        // ✅ Pending user — signup not completed
        if (user.isPending) {
            return done(null, false, { message: 'Please complete your signup first.' });
        }

        // ✅ Google-only user — has googleId but NO password hash
        if (user.googleId && !user.salt) {
            return done(null, false, { message: 'This account uses Google login. Please click "Continue with Google".' });
        }

        // ✅ OTP-only user — no password set
        if (!user.salt) {
            return done(null, false, { message: 'This account uses OTP login. Please use the OTP Login tab.' });
        }

        // ✅ Normal password check — fetch mongoose doc for .authenticate()
        const mongooseUser = await User.findOne({ email });
        mongooseUser.authenticate(password, (err, thisUser, passwordError) => {
            if (err)       return done(err);
            if (!thisUser) return done(null, false, { message: 'Incorrect password. Please try again.' });
            return done(null, thisUser);
        });

    } catch (err) {
        return done(err);
    }
}));

// ── Google Strategy ────────────────────────────────────────
passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (!user) {
            // ✅ Brand new Google user — create full account
            const result = await User.collection.insertOne({
                email,
                username:   profile.displayName,
                googleId:   profile.id,
                isVerified: true,
                isPending:  false,
                createdAt:  new Date()
            });
            user = await User.findById(result.insertedId);

        } else if (user.isPending) {
            // ✅ Pending signup user — complete their account via Google
            await User.collection.updateOne(
                { email },
                {
                    $set: {
                        username:    profile.displayName,
                        googleId:    profile.id,
                        isVerified:  true,
                        isPending:   false,
                        otpVerified: false,
                    },
                    $unset: { otp: '', otpExpiry: '' }
                }
            );
            user = await User.findOne({ email });

        } else if (!user.googleId && user.salt) {
            // ✅ Existing email/password user signing in with Google
            // Link Google BUT keep their password intact
            await User.collection.updateOne(
                { email },
                { $set: { googleId: profile.id, isVerified: true } }
            );
            user = await User.findOne({ email });

        } else if (!user.googleId && !user.salt) {
            // ✅ OTP-only user — link Google to their account
            await User.collection.updateOne(
                { email },
                { $set: { googleId: profile.id, isVerified: true } }
            );
            user = await User.findOne({ email });
        }

        return done(null, user);

    } catch (err) {
        return done(err, null);
    }
}));

// ── Serialize / Deserialize ────────────────────────────────
passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser(async (id, done) => {
    try {
        // ✅ Use collection.findOne to always get fresh data from DB
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;