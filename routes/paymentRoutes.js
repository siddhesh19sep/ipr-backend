const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { createOrder, verifyPayment } = require("../controllers/paymentController");

// Protect payment routes
router.use(authMiddleware);

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);

module.exports = router;
