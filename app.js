if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const connectMongo = require("connect-mongo");
const MongoStore = connectMongo.MongoStore || connectMongo.default || connectMongo;
const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const ExpressError = require("./utils/ExpressError.js");
const User = require("./models/user.js");

// Routes
const listingsRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingsRouter = require("./routes/booking.js");
const cabsRouter = require("./routes/cab.js");
const feedbackRouter = require("./routes/feedback.js");

let rawMongoUrl = (process.env.MONGO_URL || process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust").trim();
if (rawMongoUrl.startsWith("MONGO_URL=")) {
    rawMongoUrl = rawMongoUrl.replace(/^MONGO_URL=/, "").trim();
}
const MONGO_URL = rawMongoUrl;
const SECRET = (process.env.SECRET || "wanderlust_default_secret_key_2026_xyz").trim();
const PORT = process.env.PORT || 8080;

// Connect to MongoDB
main()
    .then(() => {
        console.log("Connected to MongoDB successfully");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err.message);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

// Trust reverse proxy (essential for Render HTTPS, secure cookies, and OAuth callbacks)
app.set("trust proxy", 1);

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session Store with MongoStore
const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    crypto: {
        secret: SECRET,
    },
    touchAfter: 24 * 3600,
});

/** @type {any} */ (store).on("error", (err) => {
    console.error("Session Store Error:", err);
});

const sessionOptions = {
    store,
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax"
    },
};

app.use(session(sessionOptions));
app.use(flash());

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// Local Strategy supporting login via username OR email
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const trimmed = (username || "").trim();
            const user = await User.findOne({
                $or: [
                    { username: trimmed },
                    { email: trimmed.toLowerCase() }
                ]
            });
            if (!user) {
                return done(null, false, { message: "No account found with that username or email." });
            }
            const authResult = await /** @type {any} */ (user).authenticate(password);
            if (authResult.error) {
                return done(null, false, { message: authResult.error.message || "Incorrect password." });
            }
            if (!authResult.user) {
                return done(null, false, { message: "Invalid credentials." });
            }
            return done(null, authResult.user);
        } catch (err) {
            return done(err);
        }
    })
);

// Google OAuth Strategy
const hasGoogleOAuth = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID !== "your_google_client_id_here"
);

if (hasGoogleOAuth) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
                proxy: true
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails && profile.emails[0]
                        ? profile.emails[0].value.toLowerCase()
                        : null;
                    const photo = profile.photos && profile.photos[0]
                        ? profile.photos[0].value
                        : "";

                    // 1. Check if user with this Google ID exists
                    let user = await User.findOne({ googleId: profile.id });
                    if (user) {
                        return done(null, user);
                    }

                    // 2. Account linking: Check if user with verified email exists
                    if (email) {
                        user = await User.findOne({ email });
                        if (user) {
                            user.googleId = profile.id;
                            if (!user.avatar || user.avatar.includes("unsplash")) {
                                user.avatar = photo;
                            }
                            if (!user.displayName) {
                                user.displayName = profile.displayName;
                            }
                            await user.save();
                            return done(null, user);
                        }
                    }

                    // 3. New User Registration via Google
                    const baseUsername = email
                        ? email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "")
                        : `user_${profile.id.slice(-4)}`;
                    let username = baseUsername;
                    let counter = 1;
                    while (await User.findOne({ username })) {
                        username = `${baseUsername}_${Math.floor(Math.random() * 9000 + 1000)}`;
                        counter++;
                        if (counter > 20) break;
                    }

                    user = new User({
                        username,
                        email: email || `${profile.id}@google.oauth`,
                        googleId: profile.id,
                        displayName: profile.displayName || username,
                        avatar: photo || undefined
                    });

                    await user.save();
                    return done(null, user);
                } catch (err) {
                    return done(err, null);
                }
            }
        )
    );
}

// Universal Passport Serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Global Locals Middleware
const { getAvatarUrl, getNameColor, getInitials, generateNameAvatar } = require("./utils/avatarHelper.js");

app.use((req, res, next) => {
    res.locals.currUser = req.user || null;
    res.locals.currentUser = req.user || null;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";
    res.locals.hasGoogleAuth = hasGoogleOAuth;
    res.locals.getAvatarUrl = getAvatarUrl;
    res.locals.getNameColor = getNameColor;
    res.locals.getInitials = getInitials;
    res.locals.generateNameAvatar = generateNameAvatar;
    next();
});

// Root Route - Redirect to Listings for Airbnb-style landing
app.get("/", (req, res) => {
    res.redirect("/listings");
});

// Application Routes
const adminRouter = require("./routes/admin.js");

app.use("/admin", adminRouter);
app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/bookings", bookingsRouter);
app.use("/cabs", cabsRouter);
app.use("/feedback", feedbackRouter);
app.use("/", userRouter);

// Static info pages
app.get("/about", (req, res) => {
    res.render("static/about.ejs");
});
app.get("/privacy", (req, res) => {
    res.render("static/privacy.ejs");
});
app.get("/terms", (req, res) => {
    res.render("static/terms.ejs");
});

// Catch-all 404 Route
app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something Went Wrong!" } = err;
    res.status(statusCode).render("error.ejs", { message, err });
});

app.listen(PORT, () => {
    console.log(`Wanderlust server is running on http://localhost:${PORT}`);
});