const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");
const User = require("./user.js");

const DEFAULT_IMAGE_URL = "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?auto=format&fit=crop&w=800&q=60";

const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        filename: {
            type: String,
            default: "listingimage",
        },
        url: {
            type: String,
            default: DEFAULT_IMAGE_URL,
            set: (v) => (!v || (typeof v === "string" && v.trim() === "")) ? DEFAULT_IMAGE_URL : v
        },
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: [
            "Trending",
            "Rooms",
            "Iconic Cities",
            "Mountains",
            "Castles",
            "Amazing Pools",
            "Camping",
            "Farms",
            "Arctic",
            "Beaches",
            "Resorts",
            "Adventure",
            "Villas"
        ],
        default: "Trending",
        set: (v) => (!v || (typeof v === "string" && v.trim() === "")) ? "Trending" : v
    },
    amenities: {
        type: [String],
        default: ["Wifi", "Air Conditioning", "Free Parking"]
    },
    maxGuests: {
        type: Number,
        default: 4,
        min: 1
    },
    bedrooms: {
        type: Number,
        default: 1,
        min: 1
    },
    beds: {
        type: Number,
        default: 1,
        min: 1
    },
    bathrooms: {
        type: Number,
        default: 1,
        min: 1
    },
    accommodationType: {
        type: String,
        enum: ["Entire home", "Private room", "Shared room", "Hotel room", "Villa", "Cabin", "Resort"],
        default: "Entire home",
        set: (v) => (!v || (typeof v === "string" && v.trim() === "")) ? "Entire home" : v
    },
    coordinates: {
        lat: {
            type: Number,
            default: 28.6139
        },
        lng: {
            type: Number,
            default: 77.2090
        }
    },
    geometry: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number], // [lng, lat]
            default: [77.2090, 28.6139]
        }
    },
    featured: {
        type: Boolean,
        default: false
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for average rating
listingSchema.virtual("avgRating").get(function () {
    if (!this.reviews || this.reviews.length === 0) return 0;
    // Check if reviews are populated objects
    const firstReview = /** @type {any} */ (this.reviews[0]);
    if (firstReview && typeof firstReview === "object" && firstReview.rating !== undefined) {
        const sum = this.reviews.reduce((acc, r) => acc + ((/** @type {any} */ (r)).rating || 0), 0);
        return (sum / this.reviews.length).toFixed(1);
    }
    return 0;
});

// Delete all reviews when a listing is deleted
listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing) {
        await Review.deleteMany({
            _id: { $in: listing.reviews }
        });
    }
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
