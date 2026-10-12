const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const wrapAsync = require("../utils/wrapAsync.js");
const { isloggedIn, isAdmin } = require("../middleware.js");
const adminController = require("../controllers/adminController.js");

// Temporary upload directory for imports
const tempImportDir = path.join(__dirname, "..", "uploads", "temp_import");
if (!fs.existsSync(tempImportDir)) {
    fs.mkdirSync(tempImportDir, { recursive: true });
}

// Multer configuration for import files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempImportDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "import-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".csv", ".xlsx", ".xls"];
    const allowedMimes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/csv",
        "text/plain",
        "application/octet-stream"
    ];

    if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only CSV (.csv) and Excel (.xlsx, .xls) files are supported for bulk import."), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
    fileFilter
});

// Admin Dashboard & Bulk Import UI
router.get("/bulk-import", isloggedIn, isAdmin, wrapAsync(adminController.renderBulkImport));

// Download Sample Templates (CSV / Excel)
router.get("/bulk-import/template", isloggedIn, isAdmin, wrapAsync(adminController.downloadTemplate));

// Upload & Preview Import File
router.post(
    "/bulk-import/preview",
    isloggedIn,
    isAdmin,
    upload.single("file"),
    wrapAsync(adminController.previewImport)
);

// Confirm & Execute Batch Import
router.post("/bulk-import/confirm", isloggedIn, isAdmin, wrapAsync(adminController.confirmImport));

// Download Failed Records Error Report
router.get("/bulk-import/error-report/:batchId", isloggedIn, isAdmin, wrapAsync(adminController.downloadErrorReport));

// Export Listings / Data
router.get("/bulk-import/export", isloggedIn, isAdmin, wrapAsync(adminController.exportData));

// Developer / Testing helper: Toggle Admin Role for active logged-in user
router.post("/toggle-admin", isloggedIn, wrapAsync(adminController.toggleAdminRole));

module.exports = router;
