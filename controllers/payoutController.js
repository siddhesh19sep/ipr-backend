const User = require("../models/User");
const Transaction = require("../models/Transaction");

// Update bank details
exports.updateBankDetails = async (req, res) => {
    try {
        const { accountNumber, ifsc, bankName, holderName } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ error: "User not found" });

        user.bankDetails = {
            accountNumber: accountNumber || user.bankDetails.accountNumber,
            ifsc: ifsc || user.bankDetails.ifsc,
            bankName: bankName || user.bankDetails.bankName,
            holderName: holderName || user.bankDetails.holderName
        };

        await user.save();
        res.status(200).json({ message: "Bank details updated successfully", bankDetails: user.bankDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get bank details
exports.getBankDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("bankDetails");
        if (!user) return res.status(404).json({ error: "User not found" });
        res.status(200).json(user.bankDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Request payout
exports.requestPayout = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Invalid payout amount" });
        }

        // Verify bank details exist
        const user = await User.findById(userId);
        if (!user.bankDetails || !user.bankDetails.accountNumber) {
            return res.status(400).json({ error: "Please configure bank details before requesting payout" });
        }

        // Calculate available balance
        // Total Credited - Total Completed/Processing Payouts
        const transactions = await Transaction.find({ recipient: userId });
        
        const totalEarnings = transactions
            .filter(t => ["License Fee", "Usage Royalty"].includes(t.type) && t.status === "Credited")
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalWithdrawn = transactions
            .filter(t => t.type === "Payout" && ["Processing", "Completed"].includes(t.status))
            .reduce((sum, t) => sum + t.amount, 0);

        const availableBalance = totalEarnings - totalWithdrawn;

        if (amount > availableBalance) {
            return res.status(400).json({ error: "Insufficient balance" });
        }

        // Create Payout Transaction
        const payoutTx = new Transaction({
            txId: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: "Payout",
            amount: amount,
            status: "Processing",
            recipient: userId
        });

        await payoutTx.save();
        
        // Anchor the Payout Request on the Blockchain
        try {
            const blockchainService = require("../services/blockchainService");
            const crypto = require("crypto");
            const payoutHash = crypto.createHash('sha256').update(`PAYOUT-${payoutTx.txId}-${Date.now()}`).digest('hex');
            const polygonTxHash = await blockchainService.recordOnChainEvent(payoutHash);
            
            payoutTx.blockchainTxHash = polygonTxHash;
            await payoutTx.save();
        } catch (bcError) {
            console.error("Failed to anchor payout event to blockchain:", bcError);
        }

        res.status(201).json({ 
            message: "Payout request submitted successfully", 
            transaction: payoutTx 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
