const mongoose = require("mongoose");
const Listing = require("./models/listing");
const Review = require("./models/review.js");
const { listingSchema, reviewSchema, bookingSchema, cabBookingSchema, feedbackSchema } = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");

module.exports.isloggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to do that!");
        return res.redirect("/login");
    }
    next();
};

module.exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in as an administrator to access that!");
        return res.redirect("/login");
    }

    const isAuthorized = req.user.role === "admin" ||
        req.user.username === "admin" ||
        req.user.username === "tejaswini" ||
        (process.env.ADMIN_USERS && process.env.ADMIN_USERS.split(",").map(s => s.trim()).includes(req.user.username));

    if (!isAuthorized) {
        req.flash("error", "Access denied! Administrator privileges are required for Bulk Import and Export.");
        return res.redirect("/listings");
    }

    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    let listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    if (!listing.owner || !listing.owner.equals(req.user._id)) {
        req.flash("error", "You don't have permission to edit or delete this listing!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

module.exports.validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(", ");
        req.flash("error", errMsg);
        if (req.params && req.params.id) {
            return res.redirect(`/listings/${req.params.id}/edit`);
        }
        return res.redirect("/listings/new");
    } else {
        next();
    }
};

module.exports.validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(", ");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

module.exports.validateBooking = (req, res, next) => {
    let { error } = bookingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(", ");
        if (req.params && req.params.id) {
            req.flash("error", errMsg);
            return res.redirect(`/listings/${req.params.id}`);
        }
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

module.exports.validateCabBooking = (req, res, next) => {
    let { error } = cabBookingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(", ");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

module.exports.validateFeedback = (req, res, next) => {
    let { error } = feedbackSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(", ");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

module.exports.isreviewAuthor = async (req, res, next) => {
    let { id, reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        req.flash("error", "Review not found!");
        return res.redirect(`/listings/${id}`);
    }

    let review = await Review.findById(reviewId);

    if (!review) {
        req.flash("error", "Review not found!");
        return res.redirect(`/listings/${id}`);
    }

    if (!review.author) {
        req.flash("error", "This review has no author!");
        return res.redirect(`/listings/${id}`);
    }

    if (!review.author.equals(req.user._id)) {
        req.flash("error", "You don't have permission to delete this review!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};