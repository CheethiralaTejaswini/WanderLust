const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const ExcelJS = require("exceljs");
const { sanitizeFormula } = require("./importValidation.js");

/**
 * Parse an uploaded CSV file into an array of row objects
 */
function parseCsvFile(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csvParser({
                mapHeaders: ({ header }) => header.trim()
            }))
            .on("data", (data) => rows.push(data))
            .on("end", () => resolve(rows))
            .on("error", (err) => reject(err));
    });
}

/**
 * Parse an uploaded Excel file (.xlsx or .xls) into an array of row objects
 */
async function parseExcelFile(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        throw new Error("Excel workbook contains no sheets.");
    }

    const rows = [];
    let headers = [];

    worksheet.eachRow((row, rowNumber) => {
        const values = Array.isArray(row.values) ? row.values : Object.values(row.values || {});
        if (rowNumber === 1) {
            // Header row (ExcelJS uses 1-based indexing, values[0] is undefined)
            headers = values.slice(1).map(h => (h !== undefined && h !== null ? String(h).trim() : ""));
        } else {
            const rowData = {};
            for (let i = 0; i < headers.length; i++) {
                const header = headers[i];
                if (header) {
                    const rawVal = values[i + 1];
                    // Handle Excel rich text or formula results if any
                    let cellVal = "";
                    if (rawVal !== undefined && rawVal !== null) {
                        if (typeof rawVal === "object") {
                            const objVal = /** @type {any} */ (rawVal);
                            if (objVal.result !== undefined) {
                                cellVal = String(objVal.result);
                            } else if (objVal.text !== undefined) {
                                cellVal = String(objVal.text);
                            } else {
                                cellVal = String(rawVal);
                            }
                        } else {
                            cellVal = String(rawVal);
                        }
                    }
                    rowData[header] = cellVal.trim();
                }
            }
            // Skip completely empty rows
            const hasAnyData = Object.values(rowData).some(v => v !== "");
            if (hasAnyData) {
                rows.push(rowData);
            }
        }
    });

    return rows;
}

/**
 * Generate Sample Template for Listings (CSV or Excel)
 */
async function generateListingTemplate(format = "csv") {
    const sampleHeaders = [
        "Title",
        "Description",
        "Price",
        "Location",
        "Country",
        "Category",
        "Property Type",
        "Amenities",
        "Max Guests",
        "Bedrooms",
        "Beds",
        "Bathrooms",
        "Image URL",
        "Latitude",
        "Longitude"
    ];

    const sampleRows = [
        {
            Title: "Serene Palms Oceanfront Villa",
            Description: "Experience luxury living with private infinity pool, sunset beach views, and lush tropical gardens in South Goa.",
            Price: 4500,
            Location: "Candolim, Goa",
            Country: "India",
            Category: "Beaches",
            "Property Type": "Villa",
            Amenities: "Wifi, Air Conditioning, Pool, Kitchen, Free Parking",
            "Max Guests": 6,
            Bedrooms: 3,
            Beds: 3,
            Bathrooms: 3,
            "Image URL": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
            Latitude: 15.5173,
            Longitude: 73.7635
        },
        {
            Title: "Himalayan Pine Forest Chalet",
            Description: "A tranquil wooden cedar chalet nestled in the snow peaks with fireplace, mountain view balcony, and hot tub.",
            Price: 3200,
            Location: "Old Manali, Himachal Pradesh",
            Country: "India",
            Category: "Mountains",
            "Property Type": "Cabin",
            Amenities: "Wifi, Dedicated Workspace, Free Parking, Kitchen, Hot Tub",
            "Max Guests": 4,
            Bedrooms: 2,
            Beds: 2,
            Bathrooms: 2,
            "Image URL": "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80",
            Latitude: 32.2432,
            Longitude: 77.1892
        },
        {
            Title: "Royal Heritage Courtyard Haveli",
            Description: "Traditional Rajasthani architecture with hand-carved jharokhas, courtyards, and royal dining near City Palace.",
            Price: 3800,
            Location: "Udaipur, Rajasthan",
            Country: "India",
            Category: "Castles",
            "Property Type": "Entire home",
            Amenities: "Wifi, Air Conditioning, Free Parking, Breakfast",
            "Max Guests": 5,
            Bedrooms: 2,
            Beds: 3,
            Bathrooms: 2,
            "Image URL": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
            Latitude: 24.5854,
            Longitude: 73.7125
        }
    ];

    if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Wanderlust Travel";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet("Listings Import Template");
        sheet.columns = sampleHeaders.map(h => ({
            header: h,
            key: h,
            width: Math.max(h.length + 5, 18)
        }));

        // Style Header
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFF385C" } // Wanderlust Coral
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });
        headerRow.height = 28;

        // Add sample rows
        for (let row of sampleRows) {
            sheet.addRow(row);
        }

        return await workbook.xlsx.writeBuffer();
    } else {
        // Generate CSV
        const headerLine = sampleHeaders.join(",");
        const rowLines = sampleRows.map(r => {
            return sampleHeaders.map(h => {
                const val = r[h] !== undefined ? String(r[h]) : "";
                // Escape quotes and wrap with quotes
                return `"${val.replace(/"/g, '""')}"`;
            }).join(",");
        });
        return Buffer.from([headerLine, ...rowLines].join("\r\n"), "utf-8");
    }
}

/**
 * Generate Sample Template for Reviews (CSV or Excel)
 */
async function generateReviewTemplate(format = "csv") {
    const sampleHeaders = [
        "Listing Title or ID",
        "Rating",
        "Comment",
        "Author Username"
    ];

    const sampleRows = [
        {
            "Listing Title or ID": "Gateway of India Luxury Suite",
            Rating: 5,
            Comment: "Absolutely stunning view of the sunrise over the Arabian Sea. Wonderful host and impeccable service!",
            "Author Username": ""
        },
        {
            "Listing Title or ID": "Taj Mahal Monumental View Villa",
            Rating: 5,
            Comment: "Waking up to the view of the Taj Mahal terrace was magical. Highly recommended for couples and families.",
            "Author Username": ""
        }
    ];

    if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Reviews Import Template");
        sheet.columns = sampleHeaders.map(h => ({
            header: h,
            key: h,
            width: Math.max(h.length + 6, 22)
        }));

        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF1E293B" } // Dark Slate
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });
        headerRow.height = 28;

        for (let row of sampleRows) {
            sheet.addRow(row);
        }

        return await workbook.xlsx.writeBuffer();
    } else {
        const headerLine = sampleHeaders.join(",");
        const rowLines = sampleRows.map(r => {
            return sampleHeaders.map(h => {
                const val = r[h] !== undefined ? String(r[h]) : "";
                return `"${val.replace(/"/g, '""')}"`;
            }).join(",");
        });
        return Buffer.from([headerLine, ...rowLines].join("\r\n"), "utf-8");
    }
}

/**
 * Generate an Error Report file with row-specific validation error details
 */
async function generateErrorReport(failedRows, format = "csv") {
    if (!failedRows || failedRows.length === 0) {
        return Buffer.from("No errors found in this batch.", "utf-8");
    }

    const headers = [
        "Row Number",
        "Error Details",
        "Warnings",
        "Title",
        "Price",
        "Location",
        "Country",
        "Category",
        "Description"
    ];

    const rows = failedRows.map(f => ({
        "Row Number": f.rowIndex,
        "Error Details": f.errors.join("; "),
        "Warnings": f.warnings ? f.warnings.join("; ") : "",
        Title: sanitizeFormula(f.data?.title || ""),
        Price: f.data?.price || 0,
        Location: sanitizeFormula(f.data?.location || ""),
        Country: sanitizeFormula(f.data?.country || ""),
        Category: f.data?.category || "",
        Description: sanitizeFormula(f.data?.description || "")
    }));

    if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Import Errors");
        sheet.columns = headers.map(h => ({
            header: h,
            key: h,
            width: h === "Error Details" || h === "Description" ? 35 : 18
        }));

        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFDC2626" } // Red Alert
            };
        });

        for (let r of rows) {
            sheet.addRow(r);
        }
        return await workbook.xlsx.writeBuffer();
    } else {
        const headerLine = headers.join(",");
        const rowLines = rows.map(r => {
            return headers.map(h => {
                const val = r[h] !== undefined ? String(r[h]) : "";
                return `"${val.replace(/"/g, '""')}"`;
            }).join(",");
        });
        return Buffer.from([headerLine, ...rowLines].join("\r\n"), "utf-8");
    }
}

/**
 * Export all listings from database with Anti-CSV Formula Injection protection
 */
async function exportListingsToBuffer(listings, format = "csv") {
    const headers = [
        "Listing ID",
        "Title",
        "Description",
        "Price",
        "Location",
        "Country",
        "Category",
        "Property Type",
        "Amenities",
        "Max Guests",
        "Bedrooms",
        "Beds",
        "Bathrooms",
        "Image URL",
        "Latitude",
        "Longitude",
        "Average Rating",
        "Reviews Count",
        "Created At"
    ];

    const rows = listings.map(l => ({
        "Listing ID": l._id.toString(),
        Title: sanitizeFormula(l.title || ""),
        Description: sanitizeFormula(l.description || ""),
        Price: l.price || 0,
        Location: sanitizeFormula(l.location || ""),
        Country: sanitizeFormula(l.country || ""),
        Category: l.category || "Trending",
        "Property Type": l.accommodationType || "Entire home",
        Amenities: (l.amenities || []).join(", "),
        "Max Guests": l.maxGuests || 4,
        Bedrooms: l.bedrooms || 1,
        Beds: l.beds || 1,
        Bathrooms: l.bathrooms || 1,
        "Image URL": l.image?.url || "",
        Latitude: l.coordinates?.lat || "",
        Longitude: l.coordinates?.lng || "",
        "Average Rating": l.avgRating || 0,
        "Reviews Count": (l.reviews && l.reviews.length) || 0,
        "Created At": l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : ""
    }));

    if (format === "xlsx") {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Wanderlust Travel Admin";
        const sheet = workbook.addWorksheet("Wanderlust Listings");

        sheet.columns = headers.map(h => ({
            header: h,
            key: h,
            width: h === "Description" || h === "Image URL" ? 35 : (h === "Title" ? 28 : 16)
        }));

        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF0F172A" } // Dark Navy
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });
        headerRow.height = 26;

        for (let r of rows) {
            sheet.addRow(r);
        }

        return await workbook.xlsx.writeBuffer();
    } else {
        const headerLine = headers.join(",");
        const rowLines = rows.map(r => {
            return headers.map(h => {
                const val = r[h] !== undefined ? String(r[h]) : "";
                return `"${val.replace(/"/g, '""')}"`;
            }).join(",");
        });
        return Buffer.from([headerLine, ...rowLines].join("\r\n"), "utf-8");
    }
}

/**
 * Parse an uploaded file based on its extension (.csv or .xlsx/.xls)
 */
async function parseUploadedFile(filePath, originalFilename = "") {
    const ext = path.extname(originalFilename || filePath).toLowerCase();
    if (ext === ".csv") {
        return await parseCsvFile(filePath);
    } else if (ext === ".xlsx" || ext === ".xls") {
        return await parseExcelFile(filePath);
    } else {
        throw new Error(`Unsupported file extension "${ext}". Only .csv, .xlsx, and .xls are supported.`);
    }
}

module.exports = {
    parseCsvFile,
    parseExcelFile,
    parseUploadedFile,
    generateListingTemplate,
    generateReviewTemplate,
    generateErrorReport,
    exportListingsToBuffer
};

