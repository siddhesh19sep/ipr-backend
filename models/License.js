const mongoose = require("mongoose");

const licenseSchema = new mongoose.Schema({
    ipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "IP",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    licenseType: {
        type: String,
        enum: ["Exclusive", "Non-Exclusive"],
        required: true
    },
    pricePaid: {
        type: Number,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["Active", "Expired", "Revoked"],
        default: "Active"
    },
    txId: {
        type: String, // Internal Transaction ID reference
        required: true
    },
    blockchainTxHash: {
        type: String, // Polygon Transaction Hash
        required: false
    }
}, { timestamps: true });

module.exports = mongoose.model("License", licenseSchema);
