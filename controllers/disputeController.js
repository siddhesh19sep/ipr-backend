const Dispute = require("../models/Dispute");
const IP = require("../models/IP");
const Alert = require("../models/Alert");
const { sendEmail } = require("../services/emailService");

// File a new dispute
exports.createDispute = async (req, res) => {
    try {
        const { ipId, evidence } = req.body;

        if (!ipId || !evidence) {
            return res.status(400).json({ message: "IP ID and evidence are required" });
        }

        // Find the IP to get the owner (opponent)
        const ip = await IP.findById(ipId).populate("owner");
        if (!ip) {
            return res.status(404).json({ message: "Target IP not found" });
        }

        // Prevent filing a dispute against your own IP
        if (ip.owner._id.toString() === req.user.id) {
            return res.status(400).json({ message: "You cannot file a dispute against your own IP registration" });
        }

        const dispute = await Dispute.create({
            ipId,
            ipTitle: ip.title,
            filedBy: req.user.id,
            opponent: ip.owner._id,
            evidence
        });

        const subject = `Urgent: Dispute Filed Against Your IP "${ip.title}"`;
        const text = `Hello ${ip.owner.name},\n\nA legal dispute has been filed against your registered Intellectual Property "${ip.title}".\n\nEvidence provided by the claimant:\n"${evidence}"\n\nOur administrative team will review this claim. Please expect follow-up communications.\n\nRegards,\nIPR Enforcement System`;

        // Asynchronously dispatch the email
        sendEmail(ip.owner.email, subject, text);

        res.status(201).json({
            message: "Dispute filed successfully",
            dispute
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get All Disputes (Admins see all, Creators see only ones they are involved in)
exports.getDisputes = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        if (req.user.role !== 'Admin') {
            // Creators see disputes they filed OR disputes filed against them
            query = {
                $or: [
                    { filedBy: req.user.id },
                    { opponent: req.user.id }
                ]
            };
        }

        // Add search filter if provided
        if (search) {
            query.ipTitle = { $regex: search, $options: 'i' };
        }

        const disputes = await Dispute.find(query)
            .populate("filedBy", "name email")
            .populate("opponent", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json(disputes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Dispute Status (Admin Only)
exports.updateDispute = async (req, res) => {
    try {
        const { status, notes, decision } = req.body;

        const dispute = await Dispute.findById(req.params.id)
            .populate("filedBy", "name email")
            .populate("opponent", "name email");

        if (!dispute) {
            return res.status(404).json({ message: "Dispute not found" });
        }

        if (status) dispute.status = status;
        if (notes) dispute.notes = notes;
        if (decision) {
            dispute.decision = decision;
            dispute.resolvedAt = new Date();
        }

        await dispute.save();

        // Send Alerts if resolved or dismissed
        if (status === 'Resolved' || status === 'Dismissed') {
            const resultMsg = status === 'Resolved' ? "Upheld" : "Dismissed";
            
            // Alert Claimant
            await Alert.create({
                user: dispute.filedBy._id,
                title: `Dispute Case ${resultMsg}`,
                message: `Your dispute for "${dispute.ipTitle}" has been ${status.toLowerCase()}. Verdict: ${decision || 'No details provided.'}`,
                type: "Dispute",
                relatedId: dispute.ipId
            });

            // Alert Opponent
            await Alert.create({
                user: dispute.opponent._id,
                title: `Dispute Case ${resultMsg}`,
                message: `The dispute filed against your asset "${dispute.ipTitle}" has been ${status.toLowerCase()}. Verdict: ${decision || 'No details provided.'}`,
                type: "Dispute",
                relatedId: dispute.ipId
            });
        }

        res.status(200).json({
            message: "Dispute updated and notifications sent",
            dispute
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
