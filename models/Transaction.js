const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    txId: {
        type: String,
        required: true,
        unique: true
    },
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "IP",
        required: function() { return this.type !== "Payout"; } // Not required for payouts
    },
    assetTitle: {
        type: String,
        required: function() { return this.type !== "Payout"; } // Not required for payouts
    },
    type: {
        type: String,
        enum: ["License Fee", "Usage Royalty", "Payout", "Registration Fee", "Platform Income"],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Credited", "Pending", "Processing", "Completed", "Failed"],
        default: "Credited"
    },
    licenseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "License",
        required: false
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
