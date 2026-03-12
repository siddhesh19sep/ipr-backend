const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getAdminStats, getCreatorStats } = require("../controllers/dashboardController");

router.use(authMiddleware);

// Admin Analytics (Restricted)
router.get("/admin", roleMiddleware(["Admin"]), getAdminStats);

// Creator Analytics (Creators & Admins can access their own)
router.get("/creator", getCreatorStats);

module.exports = router;
