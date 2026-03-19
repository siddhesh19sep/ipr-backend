const mongoose = require("mongoose");
const IP = require("../models/IP");
const Dispute = require("../models/Dispute");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Get Admin Dashboard Stats
exports.getAdminStats = async (req, res) => {
    try {
        const totalIPs = await IP.countDocuments();
        const pendingIPs = await IP.countDocuments({ status: 'Pending' });
        const approvedIPs = await IP.countDocuments({ status: 'Approved' });
        const openDisputes = await Dispute.countDocuments({ status: 'Open' });

        // Calculate total royalties
        const transactions = await Transaction.find();
        const totalRoyalty = transactions.reduce((acc, tx) => acc + tx.amount, 0);

        // Aggregate IP Categories
        const categoriesAggregation = await IP.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        const categories = categoriesAggregation.map(c => ({
            name: c._id || 'Uncategorized',
            value: c.count
        }));

        res.status(200).json({
            stats: {
                totalRegistrations: totalIPs,
                pendingApprovals: pendingIPs,
                activeLicenses: approvedIPs,
                disputesRaised: openDisputes,
                totalRoyalty
            },
            categories
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Creator Dashboard Stats
exports.getCreatorStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const myIPs = await IP.find({ owner: userId }).sort({ createdAt: -1 });
        const pendingIPs = myIPs.filter(ip => ip.status === 'Pending').length;
        const approvedIPs = myIPs.filter(ip => ip.status === 'Approved').length;

        // Assuming disputes where filedBy is this user or opponent is this user
        // Simplified: creator stats show disputes on THEIR IPs or disputes THEY filed.
        const myIPIds = myIPs.map(ip => ip._id);
        const openDisputes = await Dispute.countDocuments({
            $or: [{ ipId: { $in: myIPIds } }, { filedBy: userId }],
            status: 'Open'
        });

        // Transactions where they are the recipient
        const transactions = await Transaction.find({ recipient: userId });
        const totalRoyalty = transactions.reduce((acc, tx) => acc + tx.amount, 0);

        // Recent License Transactions
        const recentTransactions = await Transaction.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            stats: {
                totalAssets: myIPs.length,
                pendingApprovals: pendingIPs,
                activeLicenses: approvedIPs,
                openDisputes,
                totalRoyalty
            },
            recentAssets: myIPs.slice(0, 5),
            recentTransactions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
