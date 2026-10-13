const mongoose = require("mongoose");
const Listing = require("../models/listing");
const Review = require("../models/review");

module.exports.createReview = async (req, res) => {
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

    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    listing.reviews.push(newReview._id);

    await newReview.save();
    await listing.save();

    req.flash("success", "Review Submitted Successfully!");
    res.redirect(`/listings/${listing._id}`);
};

module.exports.destroyReview = async (req, res) => {
    let { id, reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    if (mongoose.Types.ObjectId.isValid(reviewId)) {
        await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
        await Review.findByIdAndDelete(reviewId);
    }

    req.flash("success", "Review Deleted Successfully!");
    res.redirect(`/listings/${id}`);
};