const mongoose = require("mongoose");
const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError.js");
const { geocodeLocation, getNearbyPlaces } = require("../utils/geocoder.js");
const { processUploadedFile } = require("../cloudConfig.js");

const CATEGORIES = [
    { name: "Trending", icon: "fa-fire" },
    { name: "Beaches", icon: "fa-umbrella-beach" },
    { name: "Mountains", icon: "fa-mountain" },
    { name: "Iconic Cities", icon: "fa-city" },
    { name: "Rooms", icon: "fa-bed" },
    { name: "Castles", icon: "fa-fort-awesome" },
    { name: "Amazing Pools", icon: "fa-person-swimming" },
    { name: "Camping", icon: "fa-campground" },
    { name: "Farms", icon: "fa-cow" },
    { name: "Arctic", icon: "fa-snowflake" },
    { name: "Resorts", icon: "fa-hotel" },
    { name: "Adventure", icon: "fa-compass" },
    { name: "Villas", icon: "fa-landmark" }
];

module.exports.CATEGORIES = CATEGORIES;

module.exports.index = async (req, res) => {
    const { category, q, minPrice, maxPrice, guests, type } = req.query;
    let filter = {};

    if (category && category !== "All") {
        filter.category = category;
    }

    if (q && q.trim() !== "") {
        const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [
            { title: regex },
            { location: regex },
            { country: regex },
            { description: regex }
        ];
    }

    const numMin = Number(minPrice);
    const numMax = Number(maxPrice);
    if (!isNaN(numMin) && minPrice !== undefined && minPrice !== "") {
        filter.price = filter.price || {};
        filter.price.$gte = Math.max(0, numMin);
    }
    if (!isNaN(numMax) && maxPrice !== undefined && maxPrice !== "") {
        filter.price = filter.price || {};
        filter.price.$lte = numMax;
    }

    const numGuests = Number(guests);
    if (!isNaN(numGuests) && guests !== undefined && guests !== "") {
        filter.maxGuests = { $gte: numGuests };
    }

    if (type && type.trim() !== "") {
        filter.accommodationType = type;
    }

    const allListings = await Listing.find(filter).populate("reviews");

    res.render("listings/index.ejs", {
        allListings,
        categories: CATEGORIES,
        activeCategory: category || "",
        searchQuery: q || "",
        minPrice: minPrice || "",
        maxPrice: maxPrice || "",
        guests: guests || "",
        selectedType: type || ""
    });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs", {
        categories: CATEGORIES
    });
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Listing you requested does not exist!");
        return res.redirect("/listings");
    }

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
                select: "username displayName avatar"
            },
        })
        .populate("owner", "username displayName avatar email bio");

    if (!listing) {
        req.flash("error", "Listing you requested does not exist!");
        return res.redirect("/listings");
    }

    // Coordinates fallback if not set or invalid
    let lat = Number(listing.coordinates?.lat || (listing.geometry?.coordinates && listing.geometry.coordinates[1]));
    let lng = Number(listing.coordinates?.lng || (listing.geometry?.coordinates && listing.geometry.coordinates[0]));
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        lat = 28.6139;
        lng = 77.2090;
    }

    // Fetch nearby places
    let nearbyPlaces = [];
    try {
        nearbyPlaces = await getNearbyPlaces(lat, lng, listing.location);
    } catch (err) {
        console.error("Failed to load nearby places:", err.message);
    }

    res.render("listings/show.ejs", {
        listing,
        nearbyPlaces,
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ""
    });
};

module.exports.createListing = async (req, res) => {
    const listingData = req.body.listing || {};

    // Sanitize values
    if (!listingData.category || listingData.category.trim() === "") {
        listingData.category = "Trending";
    }
    if (!listingData.accommodationType || listingData.accommodationType.trim() === "") {
        listingData.accommodationType = "Entire home";
    }
    if (listingData.price !== undefined) {
        listingData.price = Number(listingData.price) || 0;
    }

    // Handle amenities if passed as array or single value
    if (listingData.amenities) {
        listingData.amenities = Array.isArray(listingData.amenities)
            ? listingData.amenities
            : [listingData.amenities];
    } else {
        listingData.amenities = ["Wifi", "Air Conditioning", "Free Parking"];
    }

    const newListing = new Listing(listingData);
    newListing.owner = req.user._id;

    // Handle image upload from file or direct URL
    if (req.file) {
        const imageResult = await processUploadedFile(req.file);
        if (imageResult && imageResult.url) {
            newListing.image = imageResult;
        }
    } else if (listingData.image && listingData.image.url && listingData.image.url.trim() !== "") {
        newListing.image = {
            url: listingData.image.url.trim(),
            filename: "custom_url"
        };
    } else {
        newListing.image = {
            filename: "listingimage",
            url: "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?auto=format&fit=crop&w=800&q=60"
        };
    }

    // Geocode coordinates
    try {
        const coords = await geocodeLocation(newListing.location, newListing.country);
        newListing.coordinates = coords;
        newListing.geometry = {
            type: "Point",
            coordinates: [coords.lng, coords.lat]
        };
    } catch (e) {
        console.error("Geocoding failed, using fallback:", e.message);
    }

    await newListing.save();
    req.flash("success", "New Listing Created Successfully!");
    res.redirect(`/listings/${newListing._id}`);
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }

    let originalImageUrl = listing.image?.url || "";
    // Cloudinary transformation for preview if applicable
    if (originalImageUrl.includes("/upload")) {
        originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    }

    res.render("listings/edit.ejs", {
        listing,
        originalImageUrl,
        categories: CATEGORIES
    });
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    const listingData = req.body.listing || {};

    let listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    // Check if location changed to update coordinates
    if (listingData.location !== listing.location || listingData.country !== listing.country) {
        try {
            const coords = await geocodeLocation(listingData.location, listingData.country);
            listing.coordinates = coords;
            listing.geometry = {
                type: "Point",
                coordinates: [coords.lng, coords.lat]
            };
        } catch (e) {
            console.error("Re-geocoding failed:", e.message);
        }
    }

    // Handle amenities
    if (listingData.amenities) {
        listingData.amenities = Array.isArray(listingData.amenities)
            ? listingData.amenities
            : [listingData.amenities];
    } else {
        listingData.amenities = [];
    }

    // Extract submitted image url before deleting listingData.image
    const submittedImageUrl = listingData.image && listingData.image.url ? listingData.image.url.trim() : "";
    delete listingData.image; // prevent Object.assign from overriding listing.image with empty values

    // Sanitize category & accommodationType
    if (!listingData.category || listingData.category.trim() === "") {
        listingData.category = listing.category || "Trending";
    }
    if (!listingData.accommodationType || listingData.accommodationType.trim() === "") {
        listingData.accommodationType = listing.accommodationType || "Entire home";
    }
    if (listingData.price !== undefined) {
        listingData.price = Number(listingData.price) || listing.price;
    }

    Object.assign(listing, listingData);

    // Handle image update:
    // 1. If new file uploaded:
    if (req.file) {
        const imageResult = await processUploadedFile(req.file);
        if (imageResult && imageResult.url) {
            listing.image = imageResult;
        }
    } else if (submittedImageUrl !== "") {
        // 2. If new image URL provided:
        listing.image = {
            url: submittedImageUrl,
            filename: "updated_image_url"
        };
    }
    // 3. Otherwise: existing listing.image is preserved intact!

    await listing.save();
    req.flash("success", "Listing Updated Successfully!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted Successfully!");
    res.redirect("/listings");
};

