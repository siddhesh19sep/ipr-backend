const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema({
    // Only one settings document should ever exist in the collection
    singleton: {
        type: String,
        default: 'GLOBAL',
        unique: true
    },
    pricingMatrix: {
        Patent: {
            type: Number,
            default: 750 // USD/INR equivalent per year
        },
        Trademark: {
            type: Number,
            default: 850
        },
        Copyright: {
            type: Number,
            default: 35
        },
        "Trade Secret": {
            type: Number,
            default: 50
        },
        Other: {
            type: Number,
            default: 100
        }
    }
}, { timestamps: true });

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);
