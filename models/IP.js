const mongoose = require("mongoose");

const ipSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    fileHash: {
        type: String,
        required: true
    },
    txHash: {
        type: String, // Blockchain transaction hash
        required: false
    },
    registrationCost: {
        type: Number,
        required: false
    },
    expirationDate: {
        type: Date,
        required: false
    },
    category: {
        type: String,
        enum: ["Patent", "Trademark", "Copyright", "Trade Secret", "Other"],
        default: "Other"
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    // Licensing Fields
    isAvailableForLicense: {
        type: Boolean,
        default: false
    },
    licensePrice: {
        type: Number,
        default: 0
    },
    licenseType: {
        type: String,
        enum: ["Exclusive", "Non-Exclusive", "None"],
        default: "None"
    },
    fileData: {
        type: String, // Base64 or Text content
        required: false
    },
    gridFsId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    }
}, { timestamps: true });

module.exports = mongoose.model("IP", ipSchema);
