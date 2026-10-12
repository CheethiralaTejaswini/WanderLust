const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isloggedIn, validateCabBooking } = require("../middleware.js");
const cabController = require("../controllers/cabs.js");

// Render cab booking form
router.get("/book", isloggedIn, wrapAsync(cabController.renderCabBookingForm));

// Real-time Fare Estimate API
router.post("/estimate", isloggedIn, wrapAsync(cabController.estimateFare));

// Create internal cab booking
router.post("/book", isloggedIn, validateCabBooking, wrapAsync(cabController.createCabBooking));

// Cab confirmation page
router.get("/:id/confirmation", isloggedIn, wrapAsync(cabController.showConfirmation));

// Cancel cab booking
router.post("/:id/cancel", isloggedIn, wrapAsync(cabController.cancelCabBooking));

module.exports = router;
