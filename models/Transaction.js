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
        required: true
    },
    assetTitle: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["License Fee", "Usage Royalty"],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Credited", "Pending"],
        default: "Credited"
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
