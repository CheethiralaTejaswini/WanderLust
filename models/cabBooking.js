const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cabBookingSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing"
    },
    pickupLocation: {
        type: String,
        required: true,
        trim: true
    },
    dropoffLocation: {
        type: String,
        required: true,
        trim: true
    },
    travelDate: {
        type: Date,
        required: true
    },
    pickupTime: {
        type: String,
        required: true
    },
    passengers: {
        type: Number,
        default: 1,
        min: 1,
        max: 8
    },
    cabType: {
        type: String,
        enum: [
            "Economy Hatchback",
            "Sedan Comfort",
            "SUV Prime",
            "Luxury Executive"
        ],
        default: "Sedan Comfort"
    },
    distanceKm: {
        type: Number,
        default: 15
    },
    estimatedDuration: {
        type: String,
        default: "35 mins"
    },
    estimatedFare: {
        type: Number,
        required: true
    },
    contactPhone: {
        type: String,
        required: true
    },
    driverNotes: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
        default: "Confirmed"
    },
    bookingCode: {
        type: String,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const CabBooking = mongoose.model("CabBooking", cabBookingSchema);

module.exports = CabBooking;
