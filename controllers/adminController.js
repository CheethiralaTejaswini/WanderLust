const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const User = require("../models/user.js");
const { CATEGORIES } = require("./listings.js");
const { geocodeLocation } = require("../utils/geocoder.js");
const {
    validateListingRow,
    validateReviewRow
} = require("../utils/importValidation.js");
const {
    parseCsvFile,
    parseExcelFile,
    generateListingTemplate,
    generateReviewTemplate,
    generateErrorReport,
    exportListingsToBuffer
} = require("../utils/fileParser.js");

// In-memory / session store for preview batches (cleared automatically after 1 hour)
const activeBatches = new Map();

function cleanOldBatches() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, batch] of activeBatches.entries()) {
        if (batch.createdAt < oneHourAgo) {
            activeBatches.delete(id);
        }
    }
}

/**
 * 1. Render Admin Bulk Import & Export Dashboard
 */
module.exports.renderBulkImport = async (req, res) => {
    try {
        cleanOldBatches();
        const totalListings = await Listing.countDocuments();
        const totalReviews = await Review.countDocuments();
        const totalUsers = await User.countDocuments();

        res.render("admin/bulkImport.ejs", {
            categories: CATEGORIES,
            totalListings,
            totalReviews,
            totalUsers
        });
    } catch (err) {
        req.flash("error", "Failed to load Bulk Import dashboard: " + err.message);
        res.redirect("/listings");
    }
};

/**
 * 2. Download Sample Import Templates (Listings or Reviews, CSV or Excel)
 */
module.exports.downloadTemplate = async (req, res) => {
    try {
        const type = req.query.type === "reviews" ? "reviews" : "listings";
        const format = req.query.format === "xlsx" ? "xlsx" : "csv";

        let buffer;
        let filename;

        if (type === "reviews") {
            buffer = await generateReviewTemplate(format);
            filename = `wanderlust_reviews_sample_template.${format}`;
        } else {
            buffer = await generateListingTemplate(format);
            filename = `wanderlust_listings_sample_template.${format}`;
        }

        const mimeType = format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv; charset=utf-8";

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", mimeType);
        res.send(buffer);
    } catch (err) {
        req.flash("error", "Error generating template: " + err.message);
        res.redirect("/admin/bulk-import");
    }
};

/**
 * 3. Upload & Validate File for Preview
 */
module.exports.previewImport = async (req, res) => {
    const uploadedFile = req.file;
    if (!uploadedFile) {
        return res.status(400).json({
            success: false,
            message: "No file was uploaded. Please select a valid CSV or Excel file."
        });
    }

    const tempFilePath = uploadedFile.path;
    const ext = path.extname(uploadedFile.originalname).toLowerCase();
    const importType = req.body.importType === "reviews" ? "reviews" : "listings";

    try {
        // Validate file extension
        if (![".csv", ".xlsx", ".xls"].includes(ext)) {
            throw new Error("Invalid file format. Only CSV (.csv) and Excel (.xlsx, .xls) files are accepted.");
        }

        // Parse file rows
        let rawRows = [];
        if (ext === ".csv") {
            rawRows = await parseCsvFile(tempFilePath);
        } else {
            rawRows = await parseExcelFile(tempFilePath);
        }

        if (!rawRows || rawRows.length === 0) {
            throw new Error("The uploaded file contains no data rows.");
        }

        if (rawRows.length > 2000) {
            throw new Error(`The file contains ${rawRows.length} rows. Maximum allowed per batch is 2,000 rows.`);
        }

        const validRows = [];
        const invalidRows = [];
        const duplicateRows = [];

        if (importType === "listings") {
            // Pre-fetch existing listings for duplicate detection
            const existingListings = await Listing.find({}, { title: 1, location: 1 }).lean();
            const existingMap = new Map();
            existingListings.forEach(l => {
                const key = `${(l.title || "").toLowerCase().trim()}|${(l.location || "").toLowerCase().trim()}`;
                existingMap.set(key, l._id.toString());
            });

            const seenInBatch = new Set();

            rawRows.forEach((row, i) => {
                const rowIndex = i + 2; // header is row 1
                const validated = validateListingRow(row, rowIndex);

                if (validated.isValid) {
                    const normKey = `${(validated.data.title || "").toLowerCase().trim()}|${(validated.data.location || "").toLowerCase().trim()}`;
                    const isDbDuplicate = existingMap.has(normKey);
                    const isBatchDuplicate = seenInBatch.has(normKey);

                    if (isDbDuplicate || isBatchDuplicate) {
                        validated.isDuplicate = true;
                        validated.existingId = existingMap.get(normKey) || null;
                        validated.duplicateReason = isDbDuplicate
                            ? "A listing with this title and location already exists in the database."
                            : "Duplicate listing within this uploaded file.";
                        duplicateRows.push(validated);
                    } else {
                        seenInBatch.add(normKey);
                    }
                    validRows.push(validated);
                } else {
                    invalidRows.push(validated);
                }
            });
        } else {
            // Import Type: REVIEWS
            // Pre-fetch listings and users for reference validation
            const allListings = await Listing.find({}, { title: 1, _id: 1 }).lean();
            const allUsers = await User.find({}, { username: 1, _id: 1 }).lean();

            const listingIdMap = new Map();
            const listingTitleMap = new Map();
            allListings.forEach(l => {
                listingIdMap.set(l._id.toString(), l._id);
                listingTitleMap.set((l.title || "").toLowerCase().trim(), l._id);
            });

            const userMap = new Map();
            allUsers.forEach(u => {
                userMap.set((u.username || "").toLowerCase().trim(), u._id);
            });

            rawRows.forEach((row, i) => {
                const rowIndex = i + 2;
                const validated = validateReviewRow(row, rowIndex);

                if (validated.isValid) {
                    // Match listing
                    const ref = validated.data.listingRef.trim();
                    let targetListingId = null;

                    if (mongoose.Types.ObjectId.isValid(ref) && listingIdMap.has(ref)) {
                        targetListingId = listingIdMap.get(ref);
                    } else if (listingTitleMap.has(ref.toLowerCase())) {
                        targetListingId = listingTitleMap.get(ref.toLowerCase());
                    }

                    if (!targetListingId) {
                        validated.isValid = false;
                        validated.errors.push(`Referenced listing "${ref}" does not exist in the database.`);
                        invalidRows.push(validated);
                        return;
                    }

                    validated.data.targetListingId = targetListingId;

                    // Match author
                    let targetAuthorId = req.user._id; // default to currently authenticated admin/user
                    if (validated.data.authorRef) {
                        const authorUsername = validated.data.authorRef.toLowerCase().trim();
                        if (userMap.has(authorUsername)) {
                            targetAuthorId = userMap.get(authorUsername);
                        } else {
                            validated.warnings.push(`Author "${validated.data.authorRef}" not found; assigned to your account.`);
                        }
                    }
                    validated.data.authorId = targetAuthorId;

                    validRows.push(validated);
                } else {
                    invalidRows.push(validated);
                }
            });
        }

        // Generate unique batch ID and save to cache
        const batchId = crypto.randomBytes(8).toString("hex");
        const batchPayload = {
            batchId,
            importType,
            fileName: uploadedFile.originalname,
            totalRows: rawRows.length,
            validRows,
            invalidRows,
            duplicateRows,
            createdAt: Date.now()
        };

        activeBatches.set(batchId, batchPayload);

        // Preview sample of first 150 rows
        const previewRows = [
            ...invalidRows.slice(0, 50),
            ...duplicateRows.slice(0, 50),
            ...validRows.filter(r => !r.isDuplicate).slice(0, 50)
        ].sort((a, b) => a.rowIndex - b.rowIndex);

        res.json({
            success: true,
            batchId,
            importType,
            fileName: uploadedFile.originalname,
            summary: {
                total: rawRows.length,
                valid: validRows.length,
                invalid: invalidRows.length,
                duplicates: duplicateRows.length,
                cleanValid: validRows.filter(r => !r.isDuplicate).length
            },
            preview: previewRows
        });
    } catch (err) {
        console.error("Preview import error:", err);
        res.status(400).json({
            success: false,
            message: err.message || "Failed to process the uploaded file."
        });
    } finally {
        // Clean up temporary file
        try {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        } catch (cleanupErr) {
            // ignore cleanup error
        }
    }
};

/**
 * 4. Confirm & Execute Batch Import into MongoDB
 */
module.exports.confirmImport = async (req, res) => {
    try {
        const { batchId, duplicateStrategy = "skip" } = req.body;

        if (!batchId || !activeBatches.has(batchId)) {
            return res.status(400).json({
                success: false,
                message: "Import session expired or not found. Please upload your file again to preview."
            });
        }

        const batch = activeBatches.get(batchId);
        const { importType, validRows, duplicateRows } = batch;

        let importedCount = 0;
        let skippedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;

        if (importType === "listings") {
            // Determine rows to import based on duplicate strategy:
            // "skip": import only non-duplicates
            // "allow": import all valid rows
            // "update": update existing listings, insert non-duplicates
            let rowsToInsert = [];
            let rowsToUpdate = [];

            if (duplicateStrategy === "skip") {
                rowsToInsert = validRows.filter(r => !r.isDuplicate);
                skippedCount = duplicateRows.length;
            } else if (duplicateStrategy === "allow") {
                rowsToInsert = validRows;
            } else if (duplicateStrategy === "update") {
                rowsToInsert = validRows.filter(r => !r.isDuplicate);
                rowsToUpdate = duplicateRows.filter(r => r.existingId);
            }

            // Prepare insertion documents
            const docsToInsert = [];
            for (let rowObj of rowsToInsert) {
                const item = { ...rowObj.data };
                item.owner = req.user._id; // enforce authentic ownership

                // Fallback geocoding if coordinates not supplied
                if (!item.coordinates) {
                    try {
                        const coords = await geocodeLocation(item.location, item.country);
                        item.coordinates = coords;
                        item.geometry = {
                            type: "Point",
                            coordinates: [coords.lng, coords.lat]
                        };
                    } catch (e) {
                        item.coordinates = { lat: 28.6139, lng: 77.2090 };
                        item.geometry = { type: "Point", coordinates: [77.2090, 28.6139] };
                    }
                } else {
                    item.geometry = {
                        type: "Point",
                        coordinates: [item.coordinates.lng, item.coordinates.lat]
                    };
                }

                docsToInsert.push(item);
            }

            // Batch insert in chunks of 50
            const CHUNK_SIZE = 50;
            for (let i = 0; i < docsToInsert.length; i += CHUNK_SIZE) {
                const chunk = docsToInsert.slice(i, i + CHUNK_SIZE);
                try {
                    const result = await Listing.insertMany(chunk, { ordered: false });
                    importedCount += result.length;
                } catch (batchErr) {
                    if (batchErr.insertedDocs) {
                        importedCount += batchErr.insertedDocs.length;
                    }
                    failedCount += (chunk.length - (batchErr.insertedDocs ? batchErr.insertedDocs.length : 0));
                }
            }

            // Handle updates if strategy is "update"
            if (rowsToUpdate.length > 0) {
                for (let updateRow of rowsToUpdate) {
                    try {
                        const updateData = { ...updateRow.data };
                        delete updateData.coordinates; // keep original coordinates if not explicitly changed
                        await Listing.findByIdAndUpdate(updateRow.existingId, { $set: updateData });
                        updatedCount++;
                    } catch (upErr) {
                        failedCount++;
                    }
                }
            }
        } else {
            // Import Type: REVIEWS
            for (let reviewRow of validRows) {
                try {
                    const newReview = new Review({
                        rating: reviewRow.data.rating,
                        comment: reviewRow.data.comment,
                        author: reviewRow.data.authorId
                    });
                    await newReview.save();

                    // Push to listing
                    await Listing.findByIdAndUpdate(reviewRow.data.targetListingId, {
                        $push: { reviews: newReview._id }
                    });
                    importedCount++;
                } catch (rErr) {
                    failedCount++;
                }
            }
        }

        // Clean up completed batch from memory
        activeBatches.delete(batchId);

        let statusMessage = `Import completed! Successfully imported ${importedCount} ${importType}.`;
        if (updatedCount > 0) statusMessage += ` Updated ${updatedCount} existing records.`;
        if (skippedCount > 0) statusMessage += ` Skipped ${skippedCount} duplicate records.`;
        if (failedCount > 0) statusMessage += ` Failed to import ${failedCount} records.`;

        res.json({
            success: true,
            message: statusMessage,
            summary: {
                importedCount,
                updatedCount,
                skippedCount,
                failedCount,
                total: validRows.length
            }
        });
    } catch (err) {
        console.error("Confirm import error:", err);
        res.status(500).json({
            success: false,
            message: "An error occurred while saving imported records: " + err.message
        });
    }
};

/**
 * 5. Download Failed Records Error Report (CSV or Excel)
 */
module.exports.downloadErrorReport = async (req, res) => {
    try {
        const { batchId } = req.params;
        const format = req.query.format === "xlsx" ? "xlsx" : "csv";

        if (!batchId || !activeBatches.has(batchId)) {
            req.flash("error", "The requested error report is no longer available. Please run validation again.");
            return res.redirect("/admin/bulk-import");
        }

        const batch = activeBatches.get(batchId);
        const buffer = await generateErrorReport(batch.invalidRows, format);

        const filename = `wanderlust_import_errors_${batchId}.${format}`;
        const mimeType = format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv; charset=utf-8";

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", mimeType);
        res.send(buffer);
    } catch (err) {
        req.flash("error", "Failed to generate error report: " + err.message);
        res.redirect("/admin/bulk-import");
    }
};

/**
 * 6. Export Listings from Database (CSV or Excel)
 */
module.exports.exportData = async (req, res) => {
    try {
        const format = req.query.format === "xlsx" ? "xlsx" : "csv";
        const category = req.query.category;

        const filter = {};
        if (category && category !== "All") {
            filter.category = category;
        }

        const listings = await Listing.find(filter).populate("reviews").sort({ createdAt: -1 });

        const buffer = await exportListingsToBuffer(listings, format);
        const dateStr = new Date().toISOString().split("T")[0];
        const filename = `wanderlust_listings_export_${dateStr}.${format}`;
        const mimeType = format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv; charset=utf-8";

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", mimeType);
        res.send(buffer);
    } catch (err) {
        req.flash("error", "Failed to export listings: " + err.message);
        res.redirect("/admin/bulk-import");
    }
};

/**
 * 7. Developer / Test Helper: Quick Toggle Admin Role
 */
module.exports.toggleAdminRole = async (req, res) => {
    try {
        if (!req.user) {
            req.flash("error", "You must be logged in to switch roles.");
            return res.redirect("/login");
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect("/listings");
        }

        user.role = user.role === "admin" ? "user" : "admin";
        await user.save();

        req.flash("success", `Your account role has been updated to "${user.role.toUpperCase()}".`);
        if (user.role === "admin") {
            res.redirect("/admin/bulk-import");
        } else {
            res.redirect("/profile");
        }
    } catch (err) {
        req.flash("error", "Failed to update role: " + err.message);
        res.redirect("/profile");
    }
};
