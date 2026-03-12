const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { createIP, getAllIPs, getIPById, updateIP, deleteIP } = require("../controllers/ipController");

// Protect all IP routes
router.use(authMiddleware);

router.post("/create", createIP);
router.get("/all", getAllIPs);
router.get("/:id", getIPById);
router.put("/:id", roleMiddleware(["Admin", "Verifier"]), updateIP);
router.delete("/:id", deleteIP);

module.exports = router;
