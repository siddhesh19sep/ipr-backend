const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const mongoose = require("mongoose");
const IP = require("../models/IP");
const { createIP, getAllIPs, getIPById, updateIP, deleteIP, scanIP, verifyPublicIP, renewIP, checkExpiringAssets, transferIP, getIPFile, getDiagnostics } = require("../controllers/ipController");

// Public routes
router.get("/public/verify/:hash", verifyPublicIP);

// Protect all IP routes
router.use(authMiddleware);

router.post("/scan", scanIP);
router.post("/create", createIP);
router.get("/all", getAllIPs);
router.get("/:id", getIPById);
router.get("/:id/file", getIPFile);
router.put("/:id", updateIP);
router.put("/:id/renew", renewIP);
router.put("/:id/transfer", transferIP);
router.post("/check-expirations", checkExpiringAssets);
router.get("/diagnostics", getDiagnostics);
router.delete("/:id", deleteIP);

module.exports = router;
