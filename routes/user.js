const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl, isloggedIn } = require("../middleware.js");
const userController = require("../controllers/users.js");

// Signup Routes
router.route("/signup")
    .get(userController.renderSignUpForm)
    .post(wrapAsync(userController.signup));

// Login Routes
router.route("/login")
    .get(userController.renderLoginForm)
    .post(
        saveRedirectUrl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true
        }),
        userController.login
    );

// Logout Route
router.get("/logout", userController.logout);

// Google OAuth Initiate Route
router.get("/auth/google", (req, res, next) => {
    const hasLiveKeys = !!(
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_CLIENT_ID.trim() !== "" &&
        process.env.GOOGLE_CLIENT_ID !== "your_google_client_id_here"
    );

    if (hasLiveKeys) {
        if (req.session.redirectUrl) {
            req.session.oauthRedirect = req.session.redirectUrl;
        }
        return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
    }

    // When keys are not yet configured, render the direct Gmail Sign-In page
    res.render("users/google-auth.ejs");
});

// Direct Gmail Login Form Submission
router.post("/auth/google/direct-login", wrapAsync(userController.directGoogleLogin));

// Google OAuth Live Callback Route
router.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: "Failed to authenticate with Google."
    }),
    userController.googleAuthCallback
);

// User Profile & Dashboard
router.get("/profile", isloggedIn, wrapAsync(userController.renderProfile));
router.post("/profile", isloggedIn, wrapAsync(userController.updateProfile));

module.exports = router;
