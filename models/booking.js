const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        required: true
    },
    guests: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    totalNights: {
        type: Number,
        required: true,
        min: 1
    },
    nightlyPrice: {
        type: Number,
        required: true
    },
    cleaningFee: {
        type: Number,
        default: 500
    },
    serviceFee: {
        type: Number,
        default: 300
    },
    totalPrice: {
        type: Number,
        required: true
    },
    guestName: {
        type: String,
        required: true
    },
    guestEmail: {
        type: String,
        required: true
    },
    guestPhone: {
        type: String,
        default: ""
    },
    specialRequests: {
        type: String,
        default: ""
    },
    paymentMethod: {
        type: String,
        enum: ["Pay at Check-in", "Online / Card (Test Mode)"],
        default: "Pay at Check-in"
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Completed", "Refunded"],
        default: "Pending"
    },
    status: {
        type: String,
        enum: ["Confirmed", "Cancelled", "Completed"],
        default: "Confirmed"
    },
    bookingCode: {
        type: String,
        unique: true
    },
    emailPreviewUrl: {
        type: String,
        default: ""
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Helper static method to check listing availability
bookingSchema.statics.isAvailable = async function (listingId, checkInDate, checkOutDate, excludeBookingId = null) {
    const query = {
        listing: listingId,
        status: "Confirmed",
        $or: [
            {
                checkIn: { $lt: new Date(checkOutDate) },
                checkOut: { $gt: new Date(checkInDate) }
            }
        ]
    };
    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }
    const overlapping = await this.findOne(query);
    return !overlapping;
};

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
