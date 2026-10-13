if (process.env.NODE_ENV !== "production") {
    require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
}

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

let rawMongoUrl = (process.env.MONGO_URL || process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust").trim();
if (rawMongoUrl.startsWith("MONGO_URL=")) {
    rawMongoUrl = rawMongoUrl.replace(/^MONGO_URL=/, "").trim();
}
const MONGO_URL = rawMongoUrl;

async function initDB() {
    try {
        console.log("Connecting to MongoDB for seeding...");
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB successfully!");

        // Find an existing user to assign as owner, or use fallback
        let defaultOwner = await User.findOne({});
        let ownerId = defaultOwner ? defaultOwner._id : "6ac434084fa667dcdc9de04e";

        await Listing.deleteMany({});
        const seededListings = initData.data.map((ob) => ({
            ...ob,
            owner: ownerId
        }));
        await Listing.insertMany(seededListings);
        console.log(`Successfully seeded ${seededListings.length} listings into the database!`);
    } catch (err) {
        console.error("Database seeding failed:", err.message);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
    }
}

initDB();