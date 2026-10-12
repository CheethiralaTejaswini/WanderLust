const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isloggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

// Index Route & Create Route
router.route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isloggedIn,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.createListing)
    );

// New Form Route
router.get("/new", isloggedIn, listingController.renderNewForm);

// Show, Update & Delete Routes
router.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(
        isloggedIn,
        isOwner,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(
        isloggedIn,
        isOwner,
        wrapAsync(listingController.destroyListing)
    );

// Edit Form Route
router.get("/:id/edit", isloggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;