const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { createDispute, getDisputes, updateDispute } = require("../controllers/disputeController");

// Block out routes
router.use(authMiddleware);

// Creator endpoints
router.post("/create", createDispute);
router.get("/", getDisputes);

// Admin endpoints
router.put("/:id", roleMiddleware(["Admin", "Verifier"]), updateDispute);

module.exports = router;
