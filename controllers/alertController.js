const Alert = require("../models/Alert");

exports.getMyAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.status(200).json(alerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        await Alert.findByIdAndUpdate(req.params.id, { isRead: true });
        res.status(200).json({ message: "Alert marked as read" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await Alert.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
        res.status(200).json({ message: "All alerts marked as read" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
