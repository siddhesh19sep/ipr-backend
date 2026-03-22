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

        // Calculate revenue breakdown (Summing Admin's actual income)
        const transactions = await Transaction.find();
        
        // Royalty revenue for the platform (optional) - Exclude legacy mock credits (5000)
        const royaltyRevenue = transactions
            .filter(t => ["License Fee", "Usage Royalty"].includes(t.type) && t.amount > 0 && t.amount !== 5000)
            .reduce((acc, tx) => acc + tx.amount, 0);
            
        // Registration revenue (Platform Income specifically for Admin)
        const registrationRevenue = transactions
            .filter(t => t.type === "Platform Income")
            .reduce((acc, tx) => acc + tx.amount, 0);

        const totalRevenue = registrationRevenue + royaltyRevenue;

        // Aggregate IP Categories
        const categoriesAggregation = await IP.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        const categories = categoriesAggregation.map(c => ({
            name: c._id || 'Uncategorized',
            value: c.count
        }));

        // Monthly Registrations Trend (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        
        const registrationsTrend = await IP.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { 
                _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                count: { $sum: 1 }
            }},
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const registrationsData = registrationsTrend.map(r => ({
            month: months[r._id.month - 1],
            count: r.count
        }));

        // Monthly Revenue Trend (Last 6 Months)
        const revenueTrend = await Transaction.aggregate([
            { $match: { 
                type: "Platform Income",
                createdAt: { $gte: sixMonthsAgo }
            }},
            { $group: { 
                _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                amount: { $sum: "$amount" }
            }},
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const revenueData = revenueTrend.map(r => ({
            month: months[r._id.month - 1],
            amount: r.amount
        }));

        res.status(200).json({
            stats: {
                totalRegistrations: totalIPs,
                pendingApprovals: pendingIPs,
                activeLicenses: approvedIPs,
                disputesRaised: openDisputes,
                royaltyRevenue,
                registrationRevenue,
                totalRevenue,
                registrationsTrend: registrationsData,
                revenueTrend: revenueData
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

        const myIPs = await IP.find({ owner: userId }).select("-fileData").sort({ createdAt: -1 });
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
        
        // Calculate REAL Earnings (License Fees + Usage Royalties, excluding mock 5000 credits)
        const totalEarnings = transactions
            .filter(t => ["License Fee", "Usage Royalty"].includes(t.type) && t.amount > 0 && t.amount !== 5000)
            .reduce((acc, tx) => acc + tx.amount, 0);

        // Calculate Portfolio Valuation (Sum of mock 5000 credits)
        const portfolioValuation = transactions
            .filter(t => t.type === "Usage Royalty" && t.amount === 5000)
            .reduce((acc, tx) => acc + tx.amount, 0);

        const netBalance = transactions.reduce((acc, tx) => acc + tx.amount, 0);

        // Recent License Transactions
        const recentTransactions = await Transaction.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(5);

        // Monthly Income Trend (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        
        const incomeTrend = await Transaction.aggregate([
            { $match: { 
                recipient: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: sixMonthsAgo },
                status: { $in: ["Credited", "Completed"] },
                amount: { $gt: 0, $ne: 5000 } // Exclude legacy mock credits
            }},
            { $group: { 
                _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                amount: { $sum: "$amount" }
            }},
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthsLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const royaltyTrend = incomeTrend.map(r => ({
            month: monthsLabels[r._id.month - 1],
            amount: r.amount
        }));

        res.status(200).json({
            stats: {
                totalAssets: myIPs.length,
                pendingApprovals: pendingIPs,
                activeLicenses: approvedIPs,
                openDisputes,
                totalRoyalty: totalEarnings, // Real earnings
                portfolioValuation,         // Initial valuation credits
                netBalance,
                royaltyTrend
            },
            recentAssets: myIPs.slice(0, 5),
            recentTransactions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
