const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema({
    ipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "IP",
        required: true
    },
    ipTitle: {
        type: String,
        required: true
    },
    filedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    opponent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    evidence: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Open", "In Review", "Resolved", "Dismissed"],
        default: "Open"
    },
    notes: {
        type: String,
        default: ""
    },
    decision: {
        type: String, // Final verdict text from admin
        default: ""
    },
    resolvedAt: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model("Dispute", disputeSchema);
