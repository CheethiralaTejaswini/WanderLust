const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { validateFeedback } = require("../middleware.js");
const feedbackController = require("../controllers/feedback.js");

router.route("/")
    .get(feedbackController.renderFeedbackForm)
    .post(validateFeedback, wrapAsync(feedbackController.createFeedback));

module.exports = router;
