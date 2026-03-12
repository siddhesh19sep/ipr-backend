const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    walletAddress: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true
    },
    role: {
        type: String,
        default: "User"
    },
    avatarUrl: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);