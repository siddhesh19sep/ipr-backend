const License = require("../models/License");
const IP = require("../models/IP");
const Transaction = require("../models/Transaction");
const Alert = require("../models/Alert");
const crypto = require("crypto");

/**
 * Purchase a License for an IP Asset
 */
exports.purchaseLicense = async (req, res) => {
    try {
        const { ipId, licenseType, durationYears } = req.body;
        const buyerId = req.user.id;

        const ip = await IP.findById(ipId).populate("owner");
        if (!ip) {
            return res.status(404).json({ message: "Asset not found" });
        }

        if (!ip.isAvailableForLicense) {
            return res.status(400).json({ message: "This asset is not currently available for licensing." });
        }

        if (ip.owner._id.toString() === buyerId) {
            return res.status(400).json({ message: "You already own this asset. No license required." });
        }

        // Check if user already has an active license
        const existingLicense = await License.findOne({
            ipId,
            user: buyerId,
            status: "Active",
            expiresAt: { $gt: new Date() }
        });

        if (existingLicense) {
            return res.status(400).json({ message: "You already have an active license for this asset." });
        }

        // Calculate Price
        const totalCost = ip.licensePrice * (durationYears || 1);
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + (durationYears || 1));

        const txId = `TX-LIC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        // 1. Create the License record
        const license = await License.create({
            ipId,
            user: buyerId,
            licenseType: licenseType || ip.licenseType,
            pricePaid: totalCost,
            expiresAt,
            txId
        });

        // 2. Record the Transaction for the Creator
        await Transaction.create({
            txId,
            asset: ipId,
            assetTitle: ip.title,
            type: "License Fee",
            amount: totalCost,
            status: "Credited",
            recipient: ip.owner._id,
            licenseId: license._id
        });

        // 3. Create Alert for the Owner
        await Alert.create({
            user: ip.owner._id,
            title: "New License Purchased",
            message: `A new license has been purchased for your asset: ${ip.title}.`,
            type: "License",
            relatedId: license._id
        });

        res.status(201).json({
            message: "License purchased successfully",
            license,
            transactionId: txId
        });

    } catch (error) {
        console.error("License Purchase Error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get current user's active licenses
 */
exports.getMyLicenses = async (req, res) => {
    try {
        const licenses = await License.find({ user: req.user.id })
            .populate("ipId", "title category fileHash")
            .sort({ createdAt: -1 });
        
        res.status(200).json(licenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get licenses granted for a specific IP (for Owner)
 */
exports.getAssetLicenses = async (req, res) => {
    try {
        const { ipId } = req.params;
        const ip = await IP.findById(ipId);
        
        if (!ip || ip.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to view licenses for this asset." });
        }

        const licenses = await License.find({ ipId })
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json(licenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
