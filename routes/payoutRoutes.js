const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { 
    updateBankDetails, 
    getBankDetails, 
    requestPayout 
} = require("../controllers/payoutController");

router.use(authMiddleware);

router.get("/bank-details", getBankDetails);
router.post("/bank-details", updateBankDetails);
router.post("/request", requestPayout);

module.exports = router;
