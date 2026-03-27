const mongoose = require("mongoose");
const IP = require("../models/IP");
const Dispute = require("../models/Dispute");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Get Analytics for a Specific IP Asset
exports.getIPAnalytics = async (req, res) => {
    try {
        const { ipId } = req.params;
        const userId = req.user.id;
        
        // Verify ownership/admin if needed? Or just public analytics?
        // Usually, anyone can see public royalty performance in a blockchain app.
        const ip = await IP.findById(ipId);
        if (!ip) return res.status(404).json({ message: "Asset not found" });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1); // Start of month

        const analyticsAggregation = await Transaction.aggregate([
            { $match: { 
                asset: new mongoose.Types.ObjectId(ipId),
                createdAt: { $gte: sixMonthsAgo },
                type: { $in: ["License Fee", "Usage Royalty", "License Purchase"] },
                status: { $in: ["Credited", "Completed"] },
                amount: { $gt: 0, $ne: 5000 } // Exclude mock credits
            }},
            { $group: { 
                _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                amount: { $sum: "$amount" }
            }},
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthsLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Fill in missing months with 0
        const result = [];
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i));
            const monthIdx = date.getMonth();
            const year = date.getFullYear();
            
            const match = analyticsAggregation.find(a => a._id.month === (monthIdx + 1) && a._id.year === year);
            result.push({
                month: monthsLabels[monthIdx],
                amount: match ? match.amount : 0
            });
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


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
            .filter(t => ["License Fee", "Usage Royalty", "License Purchase"].includes(t.type) && t.amount > 0 && t.amount !== 5000)
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

        // Recent Platform Transactions
        const recentTransactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .limit(10);

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
            categories,
            recentTransactions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Creator Dashboard Stats
exports.getCreatorStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const myIPs = await IP.find({ 
            $or: [
                { owner: userId },
                { "creators.user": userId }
            ]
        }).select("-fileData").sort({ createdAt: -1 });

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
        // Sync with trend logic: Include Credited, Completed, and Pending for "Real Time" feel, or just Credited/Completed for "Settled"
        const allowedStatuses = ["Credited", "Completed", "Pending"]; // Including Pending as user sees them in history
        const totalEarnings = transactions
            .filter(t => 
                ["License Fee", "Usage Royalty", "License Purchase"].includes(t.type) && 
                t.amount > 0 && 
                t.amount !== 5000 &&
                allowedStatuses.includes(t.status)
            )
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
                status: { $in: allowedStatuses },
                type: { $in: ["License Fee", "Usage Royalty", "License Purchase"] }, // Added explicit type filter to match totalEarnings
                amount: { $gt: 0, $ne: 5000 } // Exclude legacy mock credits
            }},
            { $group: { 
                _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                amount: { $sum: "$amount" }
            }},
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthsLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Fill in missing months with 0 to ensure a smooth 6-month graph
        const royaltyTrend = [];
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i));
            const monthIdx = date.getMonth();
            const year = date.getFullYear();
            
            const match = incomeTrend.find(a => a._id.month === (monthIdx + 1) && a._id.year === year);
            royaltyTrend.push({
                month: monthsLabels[monthIdx],
                amount: match ? match.amount : 0
            });
        }

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
