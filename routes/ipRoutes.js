const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { createIP, getAllIPs, getIPById, updateIP, deleteIP, scanIP, verifyPublicIP, renewIP, checkExpiringAssets } = require("../controllers/ipController");

// Public routes
router.get("/public/verify/:hash", verifyPublicIP);

// Protect all IP routes
router.use(authMiddleware);

router.post("/scan", scanIP);
router.post("/create", createIP);
router.get("/all", getAllIPs);
router.get("/:id", getIPById);
router.put("/:id", roleMiddleware(["Admin", "Verifier"]), updateIP);
router.put("/:id/renew", renewIP);
router.put("/:id/transfer", transferIP);
router.post("/check-expirations", checkExpiringAssets);
router.delete("/:id", deleteIP);

module.exports = router;
