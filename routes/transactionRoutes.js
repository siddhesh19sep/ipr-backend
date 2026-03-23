const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getUserTransactions, createTransaction, getAdminTransactions } = require("../controllers/transactionController");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

// Get all transactions logged for the user
router.get("/", getUserTransactions);

// Get all transactions across the entire platform (Admin Only)
router.get("/all", roleMiddleware(["Admin", "Verifier"]), getAdminTransactions);

// Mock route to generate a transaction
router.post("/mock", createTransaction);

module.exports = router;
