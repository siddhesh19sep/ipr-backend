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

        const ip = await IP.findById(ipId).populate("owner").populate("creators.user");
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

        // 2. Record the Split Transactions for all Creators
        const creators = ip.creators && ip.creators.length > 0 
            ? ip.creators 
            : [{ user: ip.owner, share: 100 }];

        for (const creator of creators) {
            const creatorShareAmount = (totalCost * creator.share) / 100;
            
            await Transaction.create({
                txId: `${txId}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
                asset: ipId,
                assetTitle: ip.title,
                type: "License Fee",
                amount: creatorShareAmount,
                status: "Credited",
                recipient: creator.user._id || creator.user,
                licenseId: license._id
            });
 
            // 3. Create Alert for the Creator
            await Alert.create({
                user: creator.user._id || creator.user,
                title: "Royalty Earned",
                message: `You earned ₹${creatorShareAmount.toLocaleString()} from a license purchase for "${ip.title}" (${creator.share}% share).`,
                type: "License",
                relatedId: license._id
            });
        }

        // 4. Record the Debit Transaction for the Buyer (Licensee)
        // This ensures the purchase shows up in their transaction history
        await Transaction.create({
            txId: `${txId}-PAYMENT`,
            asset: ipId,
            assetTitle: ip.title,
            type: "License Fee",
            amount: -totalCost, // Negative represents a debit/payment
            status: "Completed",
            recipient: buyerId, // In this schema, recipient denotes the ledger owner
            licenseId: license._id
        });

        // 5. Anchor the Royalty Distribution Event on the Blockchain
        try {
            const blockchainService = require("../services/blockchainService");
            const royaltyHash = crypto.createHash('sha256').update(`${txId}-${Date.now()}`).digest('hex');
            const polygonTxHash = await blockchainService.recordOnChainEvent(royaltyHash);
            
            // Save the Polygon Tx Hash to the license and relevant transactions if needed
            license.blockchainTxHash = polygonTxHash;
            await license.save();

            // Update all related transactions with this blockchain hash for audit trail
            await Transaction.updateMany(
                { licenseId: license._id },
                { $set: { blockchainTxHash: polygonTxHash } }
            );
        } catch (bcError) {
            console.error("Failed to anchor royalty event to blockchain:", bcError);
            // We don't fail the whole request since the DB record is already saved
        }

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
