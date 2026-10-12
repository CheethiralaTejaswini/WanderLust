const User = require("../models/user.js");
const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const CabBooking = require("../models/cabBooking.js");
const Review = require("../models/review.js");
const { generateNameAvatar } = require("../utils/avatarHelper.js");

module.exports.renderSignUpForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password, displayName } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            req.flash("error", "Please provide a valid email address with a domain (e.g. name@example.com).");
            return res.redirect("/signup");
        }
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user with this email already exists
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail) {
            req.flash("error", "An account with this email already exists. Please log in.");
            return res.redirect("/login");
        }

        const name = displayName && displayName.trim() !== "" ? displayName.trim() : username.trim();
        const newUser = new User({
            email: normalizedEmail,
            username: username.trim(),
            displayName: name,
            avatar: generateNameAvatar(name)
        });

        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to Wanderlust! Your account has been created.");
            res.redirect("/listings");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
    req.flash("success", `Welcome back to Wanderlust, ${req.user.displayName || req.user.username}!`);
    let redirectUrl = res.locals.redirectUrl || "/listings";
    delete req.session.redirectUrl;
    res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You have been logged out!");
        res.redirect("/listings");
    });
};

// Google OAuth Live Callback
module.exports.googleAuthCallback = (req, res) => {
    req.flash("success", `Successfully logged in via Google! Welcome, ${req.user.displayName || req.user.username}`);
    let redirectUrl = req.session.redirectUrl || "/listings";
    delete req.session.redirectUrl;
    res.redirect(redirectUrl);
};

// Direct Gmail Login (Developer & Instant Login)
module.exports.directGoogleLogin = async (req, res, next) => {
    try {
        let { email, displayName } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            req.flash("error", "Please provide a valid Gmail / Google email address (e.g. name@gmail.com).");
            return res.redirect("/auth/google");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const baseName = displayName && displayName.trim() !== "" ? displayName.trim() : normalizedEmail.split("@")[0];

        // 1. Try finding existing user by email
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            if (!user.googleId) {
                user.googleId = "google_" + Date.now();
            }
            if (!user.displayName) {
                user.displayName = baseName;
            }
            await user.save();
        } else {
            // 2. Create new user with Google profile specs
            const baseUsername = normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername}_${Math.floor(Math.random() * 9000 + 1000)}`;
                counter++;
                if (counter > 20) break;
            }

            user = new User({
                username,
                email: normalizedEmail,
                googleId: "google_" + Date.now(),
                displayName: baseName,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(baseName)}&background=1a73e8&color=fff&size=200`
            });
            await user.save();
        }

        req.login(user, (err) => {
            if (err) return next(err);
            req.flash("success", `Signed in with Google as ${user.email}!`);
            let redirectUrl = req.session.redirectUrl || "/listings";
            delete req.session.redirectUrl;
            res.redirect(redirectUrl);
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/login");
    }
};

// User Profile & Dashboard
module.exports.renderProfile = async (req, res) => {
    const userId = req.user._id;

    // Fetch user's listings
    const myListings = await Listing.find({ owner: userId }).populate("reviews");

    // Fetch accommodation bookings made by the user
    const myBookings = await Booking.find({ user: userId })
        .populate("listing")
        .sort({ createdAt: -1 });

    // Fetch cab bookings made by the user
    const myCabs = await CabBooking.find({ user: userId })
        .populate("listing")
        .sort({ createdAt: -1 });

    // Fetch reviews written by the user
    const myReviews = await Review.find({ author: userId });
    
    // Find listings associated with user's reviews
    const listingsWithMyReviews = await Listing.find({
        reviews: { $in: myReviews.map(r => r._id) }
    });

    // Fetch bookings received on user's own listings (Host bookings)
    const hostListingIds = myListings.map(l => l._id);
    const hostBookings = await Booking.find({ listing: { $in: hostListingIds } })
        .populate("listing")
        .populate("user", "username email displayName")
        .sort({ createdAt: -1 });

    res.render("users/profile.ejs", {
        user: req.user,
        myListings,
        myBookings,
        myCabs,
        myReviews,
        listingsWithMyReviews,
        hostBookings
    });
};

// Update Profile
module.exports.updateProfile = async (req, res) => {
    const { displayName, bio, phone, avatar, email } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/login");
    }

    if (email && email.trim() !== "" && email.toLowerCase().trim() !== user.email) {
        const normalizedEmail = email.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            req.flash("error", "Please enter a valid email address with a domain (e.g. name@example.com).");
            return res.redirect("/profile");
        }
        const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
        if (existing) {
            req.flash("error", "This email address is already registered to another account.");
            return res.redirect("/profile");
        }
        user.email = normalizedEmail;
    }

    const oldName = user.displayName || user.username;
    if (displayName !== undefined && displayName.trim() !== "") {
        user.displayName = displayName.trim();
    }
    if (bio !== undefined) user.bio = bio.trim();
    if (phone !== undefined) user.phone = phone.trim();

    const currentName = user.displayName || user.username;
    const isNameChanged = oldName !== currentName;
    const isNameBasedAvatar = !user.avatar || user.avatar.includes("ui-avatars.com") || user.avatar.includes("photo-1535713875002-d1d0cf377fde");

    if (avatar !== undefined) {
        const trimmedAvatar = avatar.trim();
        if (trimmedAvatar === "" || trimmedAvatar.includes("photo-1535713875002-d1d0cf377fde")) {
            // User requested default name-based avatar
            user.avatar = generateNameAvatar(currentName);
        } else {
            user.avatar = trimmedAvatar;
        }
    } else if (isNameChanged && isNameBasedAvatar) {
        // Name changed and avatar was previously name-generated; refresh avatar URL
        user.avatar = generateNameAvatar(currentName);
    }

    await user.save();
    req.flash("success", "Profile updated successfully!");
    res.redirect("/profile");
};
