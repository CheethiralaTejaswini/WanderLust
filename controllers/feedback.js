const Feedback = require("../models/feedback.js");

module.exports.renderFeedbackForm = (req, res) => {
    res.render("feedback/index.ejs");
};

module.exports.createFeedback = async (req, res) => {
    const { name, email, category, subject, message } = req.body.feedback;

    const newFeedback = new Feedback({
        user: req.user ? req.user._id : null,
        name,
        email,
        category,
        subject,
        message
    });

    await newFeedback.save();

    req.flash("success", "Thank you for your feedback! Our support team has received your message.");
    res.redirect("/listings");
};
