require("dotenv").config();

const express    = require("express");
const app        = express();
const mongoose   = require("mongoose");
const path       = require("path");
const methodOverride = require("method-override");
const ejsMate    = require("ejs-mate");
const session    = require("express-session");
const flash      = require("connect-flash");
const passport   = require("passport");

const ExpressError  = require("./utils/ExpressError");

const reviewRoutes   = require("./router/review");
const listingRoutes  = require("./router/listing");
const userRoutes     = require("./router/user");
const chatRoutes     = require("./router/chat");
const paymentRoutes  = require("./router/payment");
const menuRoutes     = require("./router/menu");
const bookingRoutes  = require("./router/booking");

// ─────────────────────────────────────────────────────────
//  VIEW ENGINE
// ─────────────────────────────────────────────────────────
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);

// ─────────────────────────────────────────────────────────
//  BODY / STATIC MIDDLEWARE
// ─────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────────────────
//  SESSION
// ─────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

// trust proxy only matters (and is only safe) behind a real reverse proxy in production
if (isProduction) {
  app.set("trust proxy", 1);
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing");
}

const sessionConfig = {
  name: "stay-scape-session",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,                       // only require HTTPS in production
    sameSite: isProduction ? "none" : "lax",     // "none" needs secure:true, breaks on local http
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
};

if (isProduction) {
  sessionConfig.proxy = true;
}

app.use(session(sessionConfig));
app.use(flash());

// ─────────────────────────────────────────────────────────
//  PASSPORT — must come AFTER session
// ─────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport');

// ─────────────────────────────────────────────────────────
//  LOCALS
// ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.locals.success  = req.flash("success");
    res.locals.error    = req.flash("error");
    res.locals.currUser = req.user;
    return next();
});

// ─────────────────────────────────────────────────────────
//  DATABASE
// ─────────────────────────────────────────────────────────
const MONGOURL = process.env.MONGOURL;

if (!MONGOURL) {
    console.error("❌  MONGOURL is not defined in .env — server cannot start.");
    process.exit(1);
}

mongoose
    .connect(MONGOURL)
    .then(() => console.log("✅  MongoDB connected"))
    .catch(err => {
        console.error("❌  MongoDB connection error:", err.message);
        process.exit(1);
    });

// ─────────────────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────────────────
app.get("/", (req, res) => res.redirect("/listings"));

app.use("/listings",             listingRoutes);
app.use("/listings/:id/reviews", reviewRoutes);
app.use("/bookings",             bookingRoutes);
app.use("/",                     userRoutes);
app.use("/chat",                 chatRoutes);
app.use("/payment",              paymentRoutes);
app.use("/menu",                 menuRoutes);

// ─────────────────────────────────────────────────────────
//  404
// ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
    next(new ExpressError("Page not found", 404));
});

// ─────────────────────────────────────────────────────────
//  GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message    = err.message    || "Something went wrong!";

    if (process.env.NODE_ENV !== "production") {
        console.error(err.stack);
    }

    return res.status(statusCode).render("listings/error.ejs", { message });
});

// ─────────────────────────────────────────────────────────
//  SERVER
// ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀  Server running on port ${PORT}`);
});