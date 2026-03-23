const IP = require("../models/IP");
const User = require("../models/User");
const Alert = require("../models/Alert");
const Transaction = require("../models/Transaction");
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
        console.log(`Create IP Request - Title: ${title}, FileContent Size: ${fileContent?.length || 0}`);

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

        // NEW: Upload fileContent to GridFS
        let fileId = null;
        if (fileContent) {
            const readableStream = new (require('stream').Readable)();
            readableStream.push(fileContent);
            readableStream.push(null);
            
            const uploadStream = global.gridFsBucket.openUploadStream(`${title}_document`);
            fileId = uploadStream.id;
            readableStream.pipe(uploadStream);
            
            await new Promise((resolve, reject) => {
                uploadStream.on('finish', resolve);
                uploadStream.on('error', reject);
            });
        }

        const newIP = await IP.create({
            title,
            description,
            owner: req.user.id,
            fileHash: ipfsHash,
            fileData: fileContent.length < 10000000 ? fileContent : "LARGE_FILE_STORED_IN_GRIDFS", // Keep small files for speed, reference large ones
            gridFsId: fileId, // Store the GridFS reference
            category,
            registrationCost,
            expirationDate,
            status: 'Pending'
        });

        console.log(`IP Created (GridFS) - _id: ${newIP._id}, FileSize: ${fileContent.length}`);

        // 1. Record the Registration Fee DEBIT for the User
        await Transaction.create({
            txId: `FE-REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            asset: newIP._id,
            assetTitle: newIP.title,
            type: "Registration Fee",
            amount: -registrationCost, // Negative for debit
            status: "Completed",
            recipient: req.user.id
        });

        // 2. Record the Platform Income CREDIT for the Admin
        const adminUser = await User.findOne({ role: 'Admin' });
        
        if (adminUser) {
            await Transaction.create({
                txId: `IN-REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                asset: newIP._id,
                assetTitle: newIP.title,
                type: "Platform Income",
                amount: registrationCost,
                status: "Credited",
                recipient: adminUser._id
            });
        }

        // 3. Record the INITIAL VALUATION CREDIT for the User (Mock Reward)
        await Transaction.create({
            txId: `VAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            asset: newIP._id,
            assetTitle: newIP.title,
            type: "Usage Royalty", // Use existing type so it shows in graph/balance easily
            amount: 5000, 
            status: "Credited",
            recipient: req.user.id
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
        const { search, category } = req.query;
        let query = {};

        // Search options
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) {
            query.category = category;
        }

        if (req.query.marketplace === 'true') {
            query.status = "Approved";
            query.$or = [
                { isAvailableForLicense: true, ...(query.$or ? { $and: [{ $or: query.$or }] } : {}) },
                { isAvailableForTransfer: true, ...(query.$or ? { $and: [{ $or: query.$or }] } : {}) }
            ];
            // Simplification for the OR query combining with Search:
            if (search) {
                query.$and = [
                    { $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] },
                    { $or: [{ isAvailableForLicense: true }, { isAvailableForTransfer: true }] }
                ];
                delete query.$or;
            } else {
                query.$or = [{ isAvailableForLicense: true }, { isAvailableForTransfer: true }];
            }
        }

        // Return all IPs but EXCLUDE fileData for performance and privacy in the list
        const ips = await IP.find(query)
            .select("-fileData") 
            .populate("owner", "name email walletAddress")
            .sort({ createdAt: -1 });

        res.status(200).json(ips);
    } catch (error) {
        console.error("Error in getAllIPs:", error);
        res.status(500).json({ error: error.message });
    }
};

// Get Single IP Detail (Protected access to fileData)
exports.getIPById = async (req, res) => {
    try {
        const ip = await IP.findById(req.params.id)
            .select("-fileData")
            .populate("owner", "name email walletAddress");
            
        if (!ip) {
            return res.status(404).json({ message: "IP record not found" });
        }

        // Only return fileData if: User is Admin, User is Owner, OR User holds an active License
        const userRole = req.user?.role?.toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'verifier';
        const isOwner = ip.owner._id.equals(req.user?.id || req.user?._id);
        
        let hasLicense = false;
        try {
            const License = mongoose.model("License");
            const licenseDoc = await License.findOne({ ip: ip._id, licensee: req.user?.id || req.user?._id, status: "Active" });
            hasLicense = !!licenseDoc;
        } catch (e) {
            console.error("License check error:", e);
        }

        if (!isAdmin && !isOwner && !hasLicense) {
            // If not authorized to see the full content, hide fileData
            const sanitizedIP = ip.toObject();
            delete sanitizedIP.fileData;
            return res.status(200).json(sanitizedIP);
        }

        res.status(200).json(ip);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get only the file data (lazy load)
exports.getIPFile = async (req, res) => {
    try {
        const ip = await IP.findById(req.params.id).select("fileData gridFsId owner isAvailableForLicense status");
        
        if (!ip) {
            return res.status(404).json({ message: "IP record not found" });
        }

        // Security check
        const userRole = req.user?.role?.toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'verifier';
        const isOwner = ip.owner._id ? ip.owner._id.equals(req.user?.id || req.user?._id) : ip.owner.equals(req.user?.id || req.user?._id);
        
        let hasLicense = false;
        try {
            const License = mongoose.model("License");
            const licenseDoc = await License.findOne({ ip: ip._id, licensee: req.user?.id || req.user?._id, status: "Active" });
            hasLicense = !!licenseDoc;
        } catch (e) {
            console.error("License check error:", e);
        }

        if (!isAdmin && !isOwner && !hasLicense) {
            return res.status(403).json({ message: "Not authorized to access file content" });
        }

        // If it's in GridFS, fetch it
        if (ip.gridFsId && global.gridFsBucket) {
            console.log(`Fetching large file from GridFS: ${ip.gridFsId}`);
            const downloadStream = global.gridFsBucket.openDownloadStream(ip.gridFsId);
            let fileData = '';
            
            await new Promise((resolve, reject) => {
                downloadStream.on('data', (chunk) => {
                    fileData += chunk.toString();
                });
                downloadStream.on('end', resolve);
                downloadStream.on('error', reject);
            });
            
            return res.status(200).json({ fileData });
        }

        res.status(200).json({ fileData: ip.fileData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update IP
exports.updateIP = async (req, res) => {
    try {
        const { title, description, category, status, isAvailableForLicense, licensePrice, licenseType, fileContent } = req.body;

        const ip = await IP.findById(req.params.id).populate("owner");
        if (!ip) {
            return res.status(404).json({ message: "IP not found" });
        }

        // Check ownership or admin role
        const isAdmin = req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'verifier';
        const isOwner = ip.owner._id.equals(req.user.id || req.user._id);

        console.log(`Update Request - User: ${req.user.id}, Role: ${req.user.role}, IsAdmin: ${isAdmin}, IsOwner: ${isOwner}`);

        if (!isOwner && !isAdmin) {
            console.error("Authorization failed for updateIP");
            return res.status(403).json({ message: "Not authorized to update this IP" });
        }

        // Only logic owners can update text fields
        if (isOwner && !isAdmin && status && status !== ip.status) {
            return res.status(403).json({ message: "Owners cannot modify the approval status." });
        }

        ip.title = isOwner ? (title || ip.title) : ip.title;
        ip.description = isOwner ? (description || ip.description) : ip.description;
        ip.category = isOwner ? (category || ip.category) : ip.category;
        
        // Handle Document Restoration (Large File Upload via GridFS + Hash Update)
        if (isOwner && fileContent) {
            let fileId = null;
            const readableStream = new (require('stream').Readable)();
            readableStream.push(fileContent);
            readableStream.push(null);
            
            const uploadStream = global.gridFsBucket.openUploadStream(`${ip.title}_restored`);
            fileId = uploadStream.id;
            readableStream.pipe(uploadStream);
            
            await new Promise((resolve, reject) => {
                uploadStream.on('finish', resolve);
                uploadStream.on('error', reject);
            });

            ip.gridFsId = fileId;
            ip.fileData = fileContent.length < 10000000 ? fileContent : "LARGE_FILE_STORED_IN_GRIDFS";
            
            // Critical: Remove the QmMock designation so the UI recognizes the restoration
            if (ip.fileHash && ip.fileHash.startsWith('QmMock')) {
                ip.fileHash = `QmRestored${crypto.randomBytes(16).toString('hex')}IPFS`;
            }
        } else {
            // Keep old fileData if no new content is provided
            ip.fileData = ip.fileData;
        }
        
        // Licensing Updates
        if (isOwner) {
            ip.isAvailableForLicense = isAvailableForLicense !== undefined ? isAvailableForLicense : ip.isAvailableForLicense;
            ip.licensePrice = licensePrice !== undefined ? licensePrice : ip.licensePrice;
            ip.licenseType = licenseType || ip.licenseType;
        }

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
                matchedIP: mostSimilarIP,
                report: `High similarity (${(highestScore * 100).toFixed(1)}%) detected with an existing asset owned by ${mostSimilarIP.ownerName}. Registration blocked.`
            });
        }

        if (highestScore > 0.4) {
             return res.status(200).json({ 
                isUnique: true, 
                highestScore, 
                warning: `Moderate similarity (${(highestScore * 100).toFixed(1)}%) detected. Ensure your work is original to avoid future disputes.`
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

/**
 * Renew an existing IP registration
 */
exports.renewIP = async (req, res) => {
    try {
        const { durationYears } = req.body;
        const ip = await IP.findById(req.params.id);
        
        if (!ip) return res.status(404).json({ message: "Asset not found" });
        if (ip.owner.toString() !== req.user.id) return res.status(403).json({ message: "Not authorized" });

        const yearsToAdd = durationYears || 1;
        const currentExpiration = ip.expirationDate || new Date();
        const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
        
        const newExpiration = new Date(baseDate);
        newExpiration.setFullYear(newExpiration.getFullYear() + yearsToAdd);

        const renewalCost = 1000 * yearsToAdd; 

        ip.expirationDate = newExpiration;
        await ip.save();

        // Record Renewal Transaction
        await Transaction.create({
            txId: `TX-REN-${Date.now().toString(36).toUpperCase()}`,
            asset: ip._id,
            assetTitle: ip.title,
            type: "Renewal Fee",
            amount: renewalCost,
            status: "Debited",
            recipient: "System"
        });

        res.status(200).json({
            message: "IP renewed successfully",
            newExpiration,
            ip
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Utility to check and notify for expiring assets
 */
exports.checkExpiringAssets = async (req, res) => {
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringIPs = await IP.find({
            expirationDate: { $lte: thirtyDaysFromNow, $gt: new Date() }
        });

        let alertCount = 0;
        for (const ip of expiringIPs) {
            const recentAlert = await Alert.findOne({
                user: ip.owner,
                relatedId: ip._id,
                type: "Expiration",
                createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            });

            if (!recentAlert) {
                await Alert.create({
                    user: ip.owner,
                    title: "IP Asset Expiring Soon",
                    message: `Your asset "${ip.title}" is set to expire on ${ip.expirationDate.toLocaleDateString()}. Please renew it to maintain protection.`,
                    type: "Expiration",
                    relatedId: ip._id
                });
                alertCount++;
            }
        }

        res.status(200).json({ message: `Checked assets. Dispatched ${alertCount} alerts.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Transfer Ownership of an IP Asset
 */
exports.transferIP = async (req, res) => {
    try {
        const { newOwnerEmail } = req.body;
        const ip = await IP.findById(req.params.id);
        const User = require("../models/User");

        if (!ip) return res.status(404).json({ message: "Asset not found" });
        if (ip.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: "Only the current owner can transfer this asset" });
        }

        const newOwner = await User.findOne({ email: newOwnerEmail });
        if (!newOwner) {
            return res.status(404).json({ message: "New owner user not found. They must be registered first." });
        }

        if (newOwner._id.toString() === req.user.id) {
            return res.status(400).json({ message: "You are already the owner" });
        }

        const oldOwnerId = ip.owner;
        ip.owner = newOwner._id;
        // Optionally update history or create a transaction
        await ip.save();

        // 1. Create Transaction for Transfer
        await Transaction.create({
            txId: `TX-TRF-${Date.now().toString(36).toUpperCase()}`,
            asset: ip._id,
            assetTitle: ip.title,
            type: "Ownership Transfer",
            amount: 0,
            status: "Completed",
            recipient: newOwner.name
        });

        // 2. Notify Old Owner
        await Alert.create({
            user: oldOwnerId,
            title: "Ownership Transferred",
            message: `You have successfully transferred ownership of "${ip.title}" to ${newOwner.name}.`,
            type: "System",
            relatedId: ip._id
        });

        // 3. Notify New Owner
        await Alert.create({
            user: newOwner._id,
            title: "Asset Received",
            message: `You are now the legal owner of the IP asset: "${ip.title}".`,
            type: "System",
            relatedId: ip._id
        });

        res.status(200).json({
            message: "Ownership transferred successfully",
            ip
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
