const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const crypto = require("crypto");
const { sendBookingConfirmationEmail } = require("../utils/mailer.js");

module.exports.createBooking = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    const {
        checkIn,
        checkOut,
        guests,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests,
        paymentMethod
    } = req.body.booking;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Validate date sequence
    if (checkOutDate <= checkInDate) {
        req.flash("error", "Check-out date must be after check-in date!");
        return res.redirect(`/listings/${id}`);
    }

    // Validate guest capacity
    if (Number(guests) > listing.maxGuests) {
        req.flash("error", `Maximum guest capacity for this listing is ${listing.maxGuests}.`);
        return res.redirect(`/listings/${id}`);
    }

    // Availability check
    const isAvailable = await /** @type {any} */ (Booking).isAvailable(id, checkInDate, checkOutDate);
    if (!isAvailable) {
        req.flash("error", "Sorry, this listing is already reserved for the selected dates. Please choose different dates.");
        return res.redirect(`/listings/${id}`);
    }

    // Calculate nights & pricing
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const totalNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const nightlyPrice = listing.price;
    const cleaningFee = Math.round(nightlyPrice * 0.05) + 200;
    const serviceFee = Math.round(nightlyPrice * 0.08) + 150;
    const totalPrice = (nightlyPrice * totalNights) + cleaningFee + serviceFee;

    const bookingCode = "WND-" + crypto.randomBytes(3).toString("hex").toUpperCase();

    const newBooking = new Booking({
        listing: listing._id,
        user: req.user._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: Number(guests),
        totalNights,
        nightlyPrice,
        cleaningFee,
        serviceFee,
        totalPrice,
        guestName: guestName || req.user.displayName || req.user.username,
        guestEmail: guestEmail || req.user.email,
        guestPhone: guestPhone || "",
        specialRequests: specialRequests || "",
        paymentMethod: paymentMethod || "Pay at Check-in",
        status: "Confirmed",
        bookingCode
    });

    await newBooking.save();

    // Send confirmation email to guest
    const emailResult = await sendBookingConfirmationEmail(newBooking, listing);

    if (emailResult && emailResult.previewUrl) {
        newBooking.emailPreviewUrl = emailResult.previewUrl;
        await newBooking.save();
        req.flash("success", `Booking confirmed! Confirmation email dispatched for ${newBooking.guestEmail}. <a href="${emailResult.previewUrl}" target="_blank" class="fw-bold text-dark text-decoration-underline ms-1">View Sent Email &rarr;</a>`);
    } else {
        req.flash("success", `Booking confirmed! Confirmation email sent to ${newBooking.guestEmail}. Code: ${bookingCode}`);
    }
    res.redirect(`/bookings/${newBooking._id}/confirmation`);
};

module.exports.showConfirmation = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id)
        .populate("listing")
        .populate("user", "username email displayName");

    if (!booking) {
        req.flash("error", "Booking not found!");
        return res.redirect("/listings");
    }

    // Ensure only the booker or host can view this confirmation
    const isBooker = booking.user && (
        (booking.user._id && booking.user._id.equals(req.user._id)) ||
        (typeof booking.user.equals === "function" && booking.user.equals(req.user._id))
    );
    const hostUser = /** @type {any} */ (booking.listing)?.owner;
    const isHost = hostUser && (
        (hostUser._id && hostUser._id.equals(req.user._id)) ||
        (typeof hostUser.equals === "function" && hostUser.equals(req.user._id))
    );

    if (!isBooker && !isHost) {
        req.flash("error", "You do not have permission to view this reservation.");
        return res.redirect("/listings");
    }

    res.render("bookings/confirmation.ejs", { booking });
};

module.exports.listUserBookings = async (req, res) => {
    const bookings = await Booking.find({ user: req.user._id })
        .populate({
            path: "listing",
            populate: {
                path: "owner",
                select: "username displayName avatar email"
            }
        })
        .sort({ createdAt: -1 });

    res.render("bookings/index.ejs", { bookings });
};

module.exports.cancelBooking = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
        req.flash("error", "Booking not found!");
        return res.redirect("/bookings");
    }

    if (!booking.user.equals(req.user._id)) {
        req.flash("error", "You don't have permission to cancel this booking!");
        return res.redirect("/bookings");
    }

    booking.status = "Cancelled";
    await booking.save();

    req.flash("success", "Your reservation has been cancelled.");
    const referer = req.get("Referrer") || "/bookings";
    res.redirect(referer);
};

module.exports.resendConfirmationEmail = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate("listing");

    if (!booking) {
        req.flash("error", "Booking not found!");
        return res.redirect("/bookings");
    }

    const result = await sendBookingConfirmationEmail(booking, booking.listing);

    if (result && result.isLive) {
        req.flash("success", `Confirmation email successfully delivered to ${booking.guestEmail}!`);
    } else if (result && result.previewUrl) {
        booking.emailPreviewUrl = result.previewUrl;
        await booking.save();
        req.flash("success", `Confirmation email sent for ${booking.guestEmail}! <a href="${result.previewUrl}" target="_blank" class="fw-bold text-dark text-decoration-underline ms-1">Click here to view your sent email &rarr;</a>`);
    } else if (result && result.error) {
        req.flash("error", `Failed to send email: ${result.error}`);
    } else {
        req.flash("success", `Confirmation email sent for ${booking.guestEmail}!`);
    }

    res.redirect(`/bookings/${booking._id}/confirmation`);
};
