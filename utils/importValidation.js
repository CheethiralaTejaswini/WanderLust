const { geocodeLocation } = require("./geocoder.js");

const VALID_CATEGORIES = [
    "Trending", "Rooms", "Iconic Cities", "Mountains", "Castles",
    "Amazing Pools", "Camping", "Farms", "Arctic", "Beaches",
    "Resorts", "Adventure", "Villas"
];

const VALID_ACCOMMODATION_TYPES = [
    "Entire home", "Private room", "Shared room", "Hotel room", "Villa", "Cabin", "Resort"
];

const DEFAULT_IMAGE_URL = "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?auto=format&fit=crop&w=800&q=60";

/**
 * Sanitize strings to protect against CSV / Excel Formula Injection
 * (e.g. cells starting with '=', '+', '-', '@', '\t', '\r')
 */
function sanitizeFormula(val) {
    if (typeof val !== "string") return val;
    const trimmed = val.trim();
    const dangerousChars = ["=", "+", "-", "@", "\t", "\r"];
    if (dangerousChars.some(c => trimmed.startsWith(c))) {
        return `'${trimmed}`;
    }
    return trimmed;
}

/**
 * Remove leading formula protection quotes when reading from CSV
 */
function unescapeFormula(val) {
    if (typeof val !== "string") return val;
    val = val.trim();
    if (val.startsWith("'") && ["=", "+", "-", "@"].includes(val.charAt(1))) {
        return val.substring(1);
    }
    return val;
}

/**
 * Find matching key in raw object using list of potential aliases
 */
function getFieldValue(rawRow, aliases) {
    const rawKeys = Object.keys(rawRow);
    for (let alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
        for (let key of rawKeys) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanKey === cleanAlias) {
                const val = rawRow[key];
                return val !== undefined && val !== null ? String(val).trim() : "";
            }
        }
    }
    return "";
}

/**
 * Parse and validate a single listing record
 */
function validateListingRow(rawRow, rowIndex) {
    const errors = [];
    const warnings = [];

    // 1. Title
    const titleRaw = getFieldValue(rawRow, ["title", "listing title", "name", "property name"]);
    const title = unescapeFormula(titleRaw);
    if (!title) {
        errors.push("Listing title is required.");
    } else if (title.length < 3) {
        errors.push("Listing title must be at least 3 characters.");
    } else if (title.length > 150) {
        errors.push("Listing title cannot exceed 150 characters.");
    }

    // 2. Description
    const descRaw = getFieldValue(rawRow, ["description", "desc", "details", "about"]);
    const description = unescapeFormula(descRaw);
    if (!description) {
        errors.push("Description is required.");
    } else if (description.length < 10) {
        errors.push("Description must be at least 10 characters long.");
    }

    // 3. Price
    const priceStr = getFieldValue(rawRow, ["price", "price per night", "nightly price", "rate", "cost"]);
    const cleanedPriceStr = priceStr.replace(/[^0-9.]/g, "");
    const price = Number(cleanedPriceStr);
    if (!priceStr) {
        errors.push("Price per night is required.");
    } else if (isNaN(price) || price < 0) {
        errors.push(`Invalid price "${priceStr}". Price must be a positive number.`);
    }

    // 4. Location & Country
    const location = unescapeFormula(getFieldValue(rawRow, ["location", "city", "address", "area"]));
    if (!location) {
        errors.push("Location / City is required.");
    }

    let country = unescapeFormula(getFieldValue(rawRow, ["country", "nation"]));
    if (!country) {
        country = "India";
        warnings.push("Country not specified; defaulted to 'India'.");
    }

    // 5. Category
    let category = getFieldValue(rawRow, ["category", "listing category", "type"]);
    if (category) {
        // Case-insensitive match against VALID_CATEGORIES
        const matchedCat = VALID_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
        if (matchedCat) {
            category = matchedCat;
        } else {
            warnings.push(`Unknown category "${category}"; defaulted to "Trending".`);
            category = "Trending";
        }
    } else {
        category = "Trending";
    }

    // 6. Accommodation Type
    let accommodationType = getFieldValue(rawRow, ["accommodation type", "property type", "room type", "accommodationtype"]);
    if (accommodationType) {
        const matchedType = VALID_ACCOMMODATION_TYPES.find(t => t.toLowerCase() === accommodationType.toLowerCase());
        if (matchedType) {
            accommodationType = matchedType;
        } else {
            warnings.push(`Unknown accommodation type "${accommodationType}"; defaulted to "Entire home".`);
            accommodationType = "Entire home";
        }
    } else {
        accommodationType = "Entire home";
    }

    // 7. Amenities
    const amenitiesRaw = getFieldValue(rawRow, ["amenities", "features", "facilities", "amenity"]);
    let amenities = ["Wifi", "Air Conditioning", "Free Parking"];
    if (amenitiesRaw) {
        const split = amenitiesRaw.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
        if (split.length > 0) {
            amenities = split;
        }
    }

    // 8. Numerical specs
    const guestsRaw = getFieldValue(rawRow, ["max guests", "guests", "capacity", "maxguests"]);
    let maxGuests = 4;
    if (guestsRaw) {
        const parsed = parseInt(guestsRaw, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
            maxGuests = parsed;
        } else {
            warnings.push(`Invalid max guests "${guestsRaw}"; defaulted to 4.`);
        }
    }

    const bedroomsRaw = getFieldValue(rawRow, ["bedrooms", "bedroom", "rooms"]);
    let bedrooms = 1;
    if (bedroomsRaw) {
        const parsed = parseInt(bedroomsRaw, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) {
            bedrooms = parsed;
        }
    }

    const bedsRaw = getFieldValue(rawRow, ["beds", "bed"]);
    let beds = bedrooms;
    if (bedsRaw) {
        const parsed = parseInt(bedsRaw, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
            beds = parsed;
        }
    }

    const bathroomsRaw = getFieldValue(rawRow, ["bathrooms", "baths", "bathroom"]);
    let bathrooms = 1;
    if (bathroomsRaw) {
        const parsed = parseInt(bathroomsRaw, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) {
            bathrooms = parsed;
        }
    }

    // 9. Image URL
    let imageUrl = unescapeFormula(getFieldValue(rawRow, ["image url", "image", "photo", "photo url", "img", "image_url"]));
    if (imageUrl) {
        // Basic URL check
        if (!/^https?:\/\//i.test(imageUrl)) {
            warnings.push(`Image URL "${imageUrl}" missing http/https protocol. Falling back to default.`);
            imageUrl = DEFAULT_IMAGE_URL;
        }
    } else {
        imageUrl = DEFAULT_IMAGE_URL;
    }

    // 10. Coordinates (optional)
    const latRaw = getFieldValue(rawRow, ["latitude", "lat"]);
    const lngRaw = getFieldValue(rawRow, ["longitude", "lng", "lon", "long"]);
    let lat = null;
    let lng = null;

    if (latRaw && lngRaw) {
        const pLat = parseFloat(latRaw);
        const pLng = parseFloat(lngRaw);
        if (!isNaN(pLat) && !isNaN(pLng) && pLat >= -90 && pLat <= 90 && pLng >= -180 && pLng <= 180) {
            lat = pLat;
            lng = pLng;
        } else {
            warnings.push(`Invalid coordinates (${latRaw}, ${lngRaw}); geocoder will determine coordinates.`);
        }
    }

    return {
        rowIndex,
        isValid: errors.length === 0,
        errors,
        warnings,
        data: {
            title,
            description,
            price: isNaN(price) ? 0 : price,
            location,
            country,
            category,
            accommodationType,
            amenities,
            maxGuests,
            bedrooms,
            beds,
            bathrooms,
            image: {
                filename: "bulk_imported_image",
                url: imageUrl
            },
            coordinates: (lat !== null && lng !== null) ? { lat, lng } : null
        }
    };
}

/**
 * Parse and validate a single review record
 */
function validateReviewRow(rawRow, rowIndex) {
    const errors = [];
    const warnings = [];

    // 1. Listing reference (can be ObjectId or listing title)
    const listingRef = unescapeFormula(getFieldValue(rawRow, ["listing id", "listing_id", "listing", "listing title", "listing title or id", "property", "stay"]));
    if (!listingRef) {
        errors.push("Listing ID or Listing Title is required.");
    }

    // 2. Rating
    const ratingRaw = getFieldValue(rawRow, ["rating", "stars", "score"]);
    const rating = parseInt(ratingRaw, 10);
    if (!ratingRaw) {
        errors.push("Review rating is required.");
    } else if (isNaN(rating) || rating < 1 || rating > 5) {
        errors.push(`Rating "${ratingRaw}" is invalid. Must be an integer from 1 to 5.`);
    }

    // 3. Comment
    const comment = unescapeFormula(getFieldValue(rawRow, ["comment", "review", "feedback", "text"]));
    if (!comment) {
        errors.push("Review comment is required.");
    } else if (comment.length < 3) {
        errors.push("Review comment must be at least 3 characters.");
    }

    // 4. Author (optional)
    const authorRef = unescapeFormula(getFieldValue(rawRow, ["author", "username", "author username", "user", "reviewer"]));

    return {
        rowIndex,
        isValid: errors.length === 0,
        errors,
        warnings,
        data: {
            listingRef,
            rating,
            comment,
            authorRef
        }
    };
}

module.exports = {
    VALID_CATEGORIES,
    VALID_ACCOMMODATION_TYPES,
    DEFAULT_IMAGE_URL,
    sanitizeFormula,
    unescapeFormula,
    validateListingRow,
    validateReviewRow
};
