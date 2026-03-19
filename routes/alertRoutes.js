const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getMyAlerts, markAsRead, markAllAsRead } = require("../controllers/alertController");

router.use(authMiddleware);

router.get("/", getMyAlerts);
router.put("/:id/read", markAsRead);
router.put("/read-all", markAllAsRead);

module.exports = router;
