const SystemSettings = require('../models/SystemSettings');

// GET /api/settings/pricing
// Returns the global pricing matrix for all categories
exports.getPricingMatrix = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne({ singleton: 'GLOBAL' });

        // If settings don't exist yet, create default values
        if (!settings) {
            settings = await SystemSettings.create({});
        }

        res.status(200).json(settings.pricingMatrix);
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        res.status(500).json({ error: "Failed to fetch pricing." });
    }
};

// PUT /api/settings/pricing
// Admin-only route to update the cost per year for each category
exports.updatePricingMatrix = async (req, res) => {
    try {
        const { pricingMatrix } = req.body;

        if (!pricingMatrix) {
            return res.status(400).json({ error: "Pricing Matrix is required." });
        }

        let settings = await SystemSettings.findOne({ singleton: 'GLOBAL' });

        if (!settings) {
            settings = new SystemSettings({});
        }

        // Merge the new data in
        settings.pricingMatrix = {
            ...settings.pricingMatrix.toObject(),
            ...pricingMatrix
        };

        // Explicitly mark as modified for Mongoose to detect nested object changes
        settings.markModified('pricingMatrix');

        await settings.save();

        res.status(200).json({
            message: "Platform pricing updated successfully",
            pricingMatrix: settings.pricingMatrix
        });
    } catch (error) {
        console.error("Failed to update settings:", error);
        res.status(500).json({ error: "Failed to update pricing." });
    }
};
