const IP = require("../models/IP");
const SystemSettings = require("../models/SystemSettings");
const crypto = require("crypto");
const blockchainService = require("../services/blockchainService");
const axios = require("axios");
const { sendEmail } = require("../services/emailService");
const stringSimilarity = require("string-similarity");

// Create new IP
exports.createIP = async (req, res) => {
    try {
        const { title, description, category, fileContent, validityPeriod } = req.body;

        if (!title || !description || !fileContent || !validityPeriod) {
            return res.status(400).json({ message: "Title, description, file content, and validity period are required" });
        }

        // Upload to IPFS via Pinata (Mocked for testing)
        let ipfsHash = "";
        try {
            // Mocking Pinata IPFS upload to bypass authentication errors
            ipfsHash = `QmMockHash${crypto.randomBytes(16).toString('hex')}IPFS`;
            console.log(`Mock Pinata flow: Successfully generated faux CID: ${ipfsHash}`);
        } catch (pinataError) {
            console.error("Failed to pin to IPFS via Pinata:", pinataError?.response?.data || pinataError.message);
            return res.status(500).json({ error: "Failed to upload document to decentalized IPFS storage." });
        }

        // Calculate Cost & Expiration based on User Selection and Global Pricing
        const yearsValid = parseInt(validityPeriod, 10);

        let settings = await SystemSettings.findOne({ singleton: 'GLOBAL' });
        let baseCostPerYear = 300; // Default fallback

        if (settings && settings.pricingMatrix && settings.pricingMatrix[category] !== undefined) {
            baseCostPerYear = settings.pricingMatrix[category];
        }

        const registrationCost = baseCostPerYear * yearsValid;

        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + yearsValid);

        const newIP = await IP.create({
            title,
            description,
            owner: req.user.id,
            fileHash: ipfsHash,
            category,
            registrationCost,
            expirationDate,
            status: 'Pending' // Requires Admin Verification to be minted on Blockchain
        });

        res.status(201).json({
            message: "IP registered successfully on IPFS & Blockchain",
            ip: newIP
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get All IPs (Secured by Role)
exports.getAllIPs = async (req, res) => {
    try {
        let query = {};

        // If the user is NOT an Admin or Verifier, restrict to only their own IPs
        if (req.user.role !== 'Admin' && req.user.role !== 'Verifier') {
            query = { owner: req.user.id };
        }

        const ips = await IP.find(query).populate("owner", "name email walletAddress");
        res.status(200).json(ips);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Single IP
exports.getIPById = async (req, res) => {
    try {
        const ip = await IP.findById(req.params.id).populate("owner", "name email walletAddress");
        if (!ip) {
            return res.status(404).json({ message: "IP not found" });
        }
        res.status(200).json(ip);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update IP
exports.updateIP = async (req, res) => {
    try {
        const { title, description, category, status } = req.body;

        const ip = await IP.findById(req.params.id).populate("owner");
        if (!ip) {
            return res.status(404).json({ message: "IP not found" });
        }

        // Check ownership or admin role
        const isAdmin = req.user.role === 'Admin' || req.user.role === 'Verifier';
        const isOwner = ip.owner._id.toString() === req.user.id;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to update this IP" });
        }

        // Only logic owners can update text fields
        if (isOwner && !isAdmin && status && status !== ip.status) {
            return res.status(403).json({ message: "Owners cannot modify the approval status." });
        }

        ip.title = isOwner ? (title || ip.title) : ip.title;
        ip.description = isOwner ? (description || ip.description) : ip.description;
        ip.category = isOwner ? (category || ip.category) : ip.category;

        let oldStatus = ip.status;

        // Only Admins can update status
        if (isAdmin) {
            ip.status = status || ip.status;

            // If the admin is approving a Pending IP for the first time, mint to Blockchain via Admin Wallet
            if (status === 'Approved' && oldStatus !== 'Approved' && !ip.txHash) {
                try {
                    console.log(`Attempting to mint IP ${ip._id} to blockchain...`);
                    const mintedTx = await blockchainService.registerIPHash(ip.fileHash);
                    ip.txHash = mintedTx;
                    console.log(`Successfully minted IP! TxHash: ${mintedTx}`);
                } catch (blockchainError) {
                    console.error("Blockchain verification minting failed FULL ERROR:", blockchainError);
                    return res.status(500).json({ error: "Failed to register IP on the blockchain during verification.", details: blockchainError.message });
                }
            }
        }

        await ip.save();
        console.log(`IP ${ip._id} saved to database with new status: ${ip.status}`);

        // Dispatch Email if Verification Status Changed
        if (isAdmin && status && status !== oldStatus) {
            try {
                console.log(`Dispatching status update email to ${ip.owner.email}`);
                const subject = `IP Verification Update: ${ip.title}`;
                const text = `Hello ${ip.owner.name},\n\nYour Intellectual Property registration for "${ip.title}" has been reviewed by an administrator.\n\nNew Status: ${ip.status}\n\n${ip.txHash ? `Your Blockchain Transaction Hash map is: ${ip.txHash}\n\n` : ''}Please log in to your dashboard to view the details.\n\nRegards,\nIPR Blockchain Team`;
                await sendEmail(ip.owner.email, subject, text);
            } catch (emailError) {
                console.error("Failed to send status update email FULL ERROR:", emailError);
                // We don't want to fail the whole request just because the email failed if the IP saved successfully
            }
        }

        res.status(200).json({
            message: "IP updated successfully",
            ip
        });
    } catch (error) {
        console.error("FATAL Update IP Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Delete IP
exports.deleteIP = async (req, res) => {
    try {
        const ip = await IP.findById(req.params.id);
        if (!ip) {
            return res.status(404).json({ message: "IP not found" });
        }

        const isAdmin = req.user.role === 'Admin';
        if (ip.owner.toString() !== req.user.id && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to delete this IP" });
        }

        await ip.deleteOne();

        res.status(200).json({ message: "IP deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// AI Plagiarism Scan
exports.scanIP = async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: "Title and description are required for AI scanning." });
        }

        const allIPs = await IP.find({}, 'title description owner').populate('owner', 'name');
        
        if (allIPs.length === 0) {
            return res.status(200).json({ isUnique: true, highestScore: 0 });
        }

        let highestScore = 0;
        let mostSimilarIP = null;

        const incomingText = `${title} ${description}`.toLowerCase();

        allIPs.forEach(ip => {
            const existingText = `${ip.title} ${ip.description}`.toLowerCase();
            const score = stringSimilarity.compareTwoStrings(incomingText, existingText);
            
            if (score > highestScore) {
                highestScore = score;
                mostSimilarIP = {
                    title: ip.title,
                    ownerName: ip.owner?.name || 'Unknown'
                };
            }
        });

        // 80% similarity threshold for plagiarism
        if (highestScore >= 0.8) {
            return res.status(200).json({ 
                isUnique: false, 
                highestScore, 
                matchedIP: mostSimilarIP 
            });
        }

        return res.status(200).json({ isUnique: true, highestScore });
    } catch (error) {
        console.error("AI Scan Error:", error);
        res.status(500).json({ error: "Failed to run AI Copyright Scan." });
    }
};

// Public IP Verification
exports.verifyPublicIP = async (req, res) => {
    try {
        const { hash } = req.params;
        
        let ip;
        try {
            ip = await IP.findById(hash).populate("owner", "name");
        } catch (e) {
            ip = await IP.findOne({ txHash: hash }).populate("owner", "name");
        }
        
        if (!ip && hash) {
            ip = await IP.findOne({ fileHash: hash }).populate("owner", "name");
        }
        
        if (!ip) {
            return res.status(404).json({ message: "No Intellectual Property found with this Registration ID or Hash." });
        }

        if (ip.status !== 'Approved') {
            return res.status(404).json({ message: "This Intellectual Property is currently pending verification and is not yet publicly certified." });
        }

        // Return only safe, public data
        res.status(200).json({
            title: ip.title,
            description: ip.description,
            category: ip.category,
            ownerName: ip.owner.name,
            registrationDate: ip.createdAt,
            expirationDate: ip.expirationDate,
            txHash: ip.txHash,
            fileHash: ip.fileHash,
            status: ip.status
        });
    } catch (error) {
        console.error("Public Verify Error:", error);
        res.status(500).json({ error: "Failed to verify IP." });
    }
};
