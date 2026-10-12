const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const { validateReview, isloggedIn, isreviewAuthor } = require("../middleware.js");
const reviewController = require("../controllers/reviews.js");

// Create Review (must be logged in first, then validate)
router.post("/", isloggedIn, validateReview, wrapAsync(reviewController.createReview));

// Delete Review (must be logged in and the review author)
router.delete("/:reviewId", isloggedIn, isreviewAuthor, wrapAsync(reviewController.destroyReview));

module.exports = router;