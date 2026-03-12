const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getUserTransactions, createTransaction } = require("../controllers/transactionController");

router.use(authMiddleware);

// Get all transactions logged for the user
router.get("/", getUserTransactions);

// Mock route to generate a transaction
router.post("/mock", createTransaction);

module.exports = router;
