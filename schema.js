const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        price: Joi.number().required().min(0),
        category: Joi.string().allow("", null),
        maxGuests: Joi.number().min(1).optional(),
        bedrooms: Joi.number().min(1).optional(),
        bathrooms: Joi.number().min(1).optional(),
        accommodationType: Joi.string().allow("", null),
        amenities: Joi.alternatives().try(
            Joi.array().items(Joi.string()),
            Joi.string()
        ).optional(),
        image: Joi.alternatives().try(
            Joi.object({
                filename: Joi.string().allow("", null),
                url: Joi.string().allow("", null)
            }),
            Joi.string().allow("", null)
        ).optional().allow(null, "")
    }).required()
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required().trim()
    }).required()
});

module.exports.bookingSchema = Joi.object({
    booking: Joi.object({
        checkIn: Joi.date().iso().required(),
        checkOut: Joi.date().iso().greater(Joi.ref("checkIn")).required(),
        guests: Joi.number().min(1).required(),
        guestName: Joi.string().trim().required(),
        guestEmail: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
        guestPhone: Joi.string().allow("", null),
        specialRequests: Joi.string().allow("", null),
        paymentMethod: Joi.string().allow("", null)
    }).unknown(true).required()
});

module.exports.cabBookingSchema = Joi.object({
    cabBooking: Joi.object({
        pickupLocation: Joi.string().required(),
        dropoffLocation: Joi.string().required(),
        travelDate: Joi.date().iso().required(),
        pickupTime: Joi.string().required(),
        passengers: Joi.number().min(1).max(8).required(),
        cabType: Joi.string().required(),
        contactPhone: Joi.string().required(),
        driverNotes: Joi.string().allow("", null).optional(),
        listingId: Joi.string().allow("", null).optional()
    }).unknown(true).required()
});

module.exports.feedbackSchema = Joi.object({
    feedback: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        category: Joi.string().required(),
        subject: Joi.string().required(),
        message: Joi.string().required()
    }).required()
});
