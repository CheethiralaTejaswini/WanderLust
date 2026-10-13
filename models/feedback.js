const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const feedbackSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ["General Suggestion", "Bug Report", "Feature Request", "Booking Support", "Host Inquiry"],
        default: "General Suggestion"
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Reviewed", "Resolved"],
        default: "Pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
