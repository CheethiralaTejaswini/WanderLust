const CabBooking = require("../models/cabBooking.js");
const Listing = require("../models/listing.js");
const crypto = require("crypto");
const { calculateCabFare } = require("../utils/geocoder.js");
const { sendCabConfirmationEmail } = require("../utils/mailer.js");

module.exports.renderCabBookingForm = async (req, res) => {
    const { listingId, pickup, destination } = req.query;
    let listing = null;
    let targetDestination = destination || "";

    if (listingId) {
        listing = await Listing.findById(listingId);
        if (listing) {
            targetDestination = `${listing.title}, ${listing.location}, ${listing.country}`;
        }
    }

    res.render("cabs/book.ejs", {
        listing,
        prefilledPickup: pickup || "",
        prefilledDestination: targetDestination,
        todayDate: new Date().toISOString().split("T")[0]
    });
};

module.exports.estimateFare = async (req, res) => {
    const { pickupLocation, dropoffLocation, cabType } = req.body;
    // Calculate deterministic distance estimate
    let combinedStr = (pickupLocation || "") + (dropoffLocation || "");
    let hash = 0;
    for (let i = 0; i < combinedStr.length; i++) {
        hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
        hash |= 0;
    }
    const distanceKm = Math.max(5, Math.min(80, (Math.abs(hash) % 40) + 8));
    const fareInfo = calculateCabFare(distanceKm, cabType);

    res.json({
        success: true,
        ...fareInfo
    });
};

module.exports.createCabBooking = async (req, res) => {
    const {
        pickupLocation,
        dropoffLocation,
        travelDate,
        pickupTime,
        passengers,
        cabType,
        contactPhone,
        driverNotes,
        listingId
    } = req.body.cabBooking;

    // Estimate distance & fare
    let combinedStr = pickupLocation + dropoffLocation;
    let hash = 0;
    for (let i = 0; i < combinedStr.length; i++) {
        hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
        hash |= 0;
    }
    const distanceKm = Math.max(5, Math.min(80, (Math.abs(hash) % 40) + 8));
    const fareInfo = calculateCabFare(distanceKm, cabType);

    const bookingCode = "CAB-" + crypto.randomBytes(3).toString("hex").toUpperCase();

    const newCabBooking = new CabBooking({
        user: req.user._id,
        listing: listingId || null,
        pickupLocation,
        dropoffLocation,
        travelDate: new Date(travelDate),
        pickupTime,
        passengers: Number(passengers),
        cabType,
        distanceKm: fareInfo.distanceKm,
        estimatedDuration: fareInfo.estimatedDuration,
        estimatedFare: fareInfo.fare,
        contactPhone,
        driverNotes: driverNotes || "",
        status: "Confirmed",
        bookingCode
    });

    await newCabBooking.save();

    // Send confirmation email
    sendCabConfirmationEmail(newCabBooking);

    req.flash("success", `Cab booked successfully! Reference code: ${bookingCode}`);
    res.redirect(`/cabs/${newCabBooking._id}/confirmation`);
};

module.exports.showConfirmation = async (req, res) => {
    const { id } = req.params;
    const cabBooking = await CabBooking.findById(id).populate("user");

    if (!cabBooking) {
        req.flash("error", "Cab booking not found!");
        return res.redirect("/listings");
    }

    if (!cabBooking.user.equals(req.user._id)) {
        req.flash("error", "You do not have permission to view this booking.");
        return res.redirect("/listings");
    }

    res.render("cabs/confirmation.ejs", { cabBooking });
};

module.exports.cancelCabBooking = async (req, res) => {
    const { id } = req.params;
    const cabBooking = await CabBooking.findById(id);

    if (!cabBooking) {
        req.flash("error", "Cab booking not found!");
        return res.redirect("/profile");
    }

    if (!cabBooking.user.equals(req.user._id)) {
        req.flash("error", "You do not have permission to cancel this booking!");
        return res.redirect("/profile");
    }

    cabBooking.status = "Cancelled";
    await cabBooking.save();

    req.flash("success", "Cab booking cancelled successfully.");
    res.redirect("/profile");
};
