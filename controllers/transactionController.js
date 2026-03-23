const Transaction = require("../models/Transaction");
const crypto = require("crypto");

// Get all transactions for a specific user
exports.getUserTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ recipient: req.user.id })
            .sort({ createdAt: -1 });

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all transactions across the entire platform (Admin Only)
exports.getAdminTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .sort({ createdAt: -1 });

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new mock transaction (For demonstration/testing purposes)
exports.createTransaction = async (req, res) => {
    try {
        const { assetId, assetTitle, type, amount, status } = req.body;

        const txId = `TX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        const transaction = await Transaction.create({
            txId,
            asset: assetId,
            assetTitle,
            type,
            amount,
            status: status || 'Credited',
            recipient: req.user.id
        });

        res.status(201).json({
            message: "Transaction recorded successfully",
            transaction
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
