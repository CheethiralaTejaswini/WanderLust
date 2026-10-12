const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isloggedIn, validateBooking } = require("../middleware.js");
const bookingController = require("../controllers/bookings.js");

// List all bookings for logged-in user
router.get("/", isloggedIn, wrapAsync(bookingController.listUserBookings));

// Create booking for a listing
router.post("/listings/:id", isloggedIn, validateBooking, wrapAsync(bookingController.createBooking));

// Booking confirmation page
router.get("/:id/confirmation", isloggedIn, wrapAsync(bookingController.showConfirmation));

// Cancel booking
router.post("/:id/cancel", isloggedIn, wrapAsync(bookingController.cancelBooking));

// Resend confirmation email
router.post("/:id/resend-email", isloggedIn, wrapAsync(bookingController.resendConfirmationEmail));

module.exports = router;
