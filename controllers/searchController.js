const IP = require("../models/IP");
const Dispute = require("../models/Dispute");

/**
 * Global Search Controller
 * Aggregates results from IPs and Disputes for a unified search experience.
 */
exports.globalSearch = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(200).json({ ips: [], disputes: [] });
        }

        const searchRegex = { $regex: query, $options: 'i' };

        // 1. Search IPs
        let ipQuery = {
            $or: [
                { title: searchRegex },
                { description: searchRegex }
            ]
        };

        // If not Admin/Verifier, only show their own IPs
        if (req.user.role !== 'Admin' && req.user.role !== 'Verifier') {
            ipQuery.owner = req.user.id;
        }

        const ips = await IP.find(ipQuery)
            .populate("owner", "name")
            .limit(10)
            .sort({ createdAt: -1 });

        // 2. Search Disputes
        let disputeQuery = {
            ipTitle: searchRegex
        };

        // If not Admin, only show disputes they are involved in
        if (req.user.role !== 'Admin') {
            disputeQuery.$and = [
                {
                    $or: [
                        { filedBy: req.user.id },
                        { opponent: req.user.id }
                    ]
                }
            ];
        }

        const disputes = await Dispute.find(disputeQuery)
            .populate("filedBy", "name")
            .populate("opponent", "name")
            .limit(10)
            .sort({ createdAt: -1 });

        res.status(200).json({
            ips: ips.map(ip => ({
                id: ip._id,
                title: ip.title,
                type: 'IP',
                status: ip.status,
                owner: ip.owner?.name
            })),
            disputes: disputes.map(d => ({
                id: d._id,
                title: d.ipTitle,
                type: 'Dispute',
                status: d.status,
                filedBy: d.filedBy?.name
            }))
        });

    } catch (error) {
        console.error("Global Search Error:", error);
        res.status(500).json({ error: "Search failed" });
    }
};
